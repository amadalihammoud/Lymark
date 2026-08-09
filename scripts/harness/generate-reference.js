/**
 * Gera imagens de referência do carimbo para o harness.
 *
 * Este script usa o CanvasKit para renderizar o carimbo em diferentes
 * resoluções e proporções, simulando o que o app Android produziria.
 *
 * As imagens geradas são salvas em scripts/harness/baseline/ e servem
 * como referência para comparação com as renderizações web e desktop.
 *
 * Uso:
 *   LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/generate-reference.js
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const NM = path.join(ROOT, 'node_modules');
const BUILD = process.env.LYMARK_CALIB_BUILD || '/tmp/lymark-build';
const BASELINE_DIR = path.join(__dirname, 'baseline');

// O código compilado preserva o alias `@/`, que o Node não conhece.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    return resolve.call(this, path.join(BUILD, 'src', request.slice(2)), ...rest);
  }
  return resolve.call(this, request, ...rest);
};

const { buildStampGeometry } = require(path.join(BUILD, 'src/features/watermark/stamp-layout.js'));
const { DEFAULT_WATERMARK_PREFERENCES } = require(
  path.join(BUILD, 'src/features/watermark/preferences.js'),
);

const CanvasKitInit = require(path.join(NM, 'canvaskit-wasm/bin/canvaskit.js'));

const stampPalette = {
  white: '#FFFFFF',
  amber: '#F5B60D',
  red: '#FF6B57',
  green: '#5BD98A',
  blue: '#63B3ED',
  black: '#111820',
};

const FONT_FILES = {
  clock: `${NM}/@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf`,
  body: `${NM}/@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf`,
  medium: `${NM}/@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf`,
};

/**
 * Configurações das fotos de teste.
 * Estas são as mesmas fotos que devem ser usadas em todos os testes.
 */
const TEST_PHOTOS = [
  {
    name: 'portrait',
    width: 3000,
    height: 4000,
    description: 'Foto em retrato 3000x4000 (3:4)',
  },
  {
    name: 'landscape',
    width: 4000,
    height: 3000,
    description: 'Foto em paisagem 4000x3000 (4:3)',
  },
  {
    name: 'square',
    width: 2000,
    height: 2000,
    description: 'Foto quadrada 2000x2000 (1:1)',
  },
  {
    name: 'highres',
    width: 6000,
    height: 4000,
    description: 'Foto de alta resolução 6000x4000 (24MP)',
  },
];

/**
 * Conteúdo fixo do carimbo para os testes.
 */
const CONTENT = {
  time: '21:55',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
  showRule: true,
  isEmpty: false,
};

/**
 * Cores do carimbo.
 */
const COLORS = {
  text: '#FFFFFF',
  accent: '#F5B60D',
  backdrop: 'rgba(0,0,0,0.75)',
  palette: stampPalette,
};

/**
 * Converte cor hex/rgba para CanvasKit Color.
 */
function toColor(CK, value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return CK.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, 1);
  }
  const rgba = /rgba?\(([^)]+)\)/.exec(value);
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim());
    return CK.Color(Number(r), Number(g), Number(b), Number(a));
  }
  return CK.WHITE;
}

/**
 * Desenha o carimbo em uma surface.
 */
function drawStamp(CK, canvas, geometry, fontFor) {
  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  // Desenhar retângulos (faixa âmbar)
  for (const rect of geometry.rects) {
    paint.setColor(toColor(CK, rect.color));
    const area = CK.XYWHRect(rect.x, rect.y, rect.width, rect.height);
    if (rect.radius) {
      canvas.drawRRect(CK.RRectXY(area, rect.radius, rect.radius), paint);
    } else {
      canvas.drawRect(area, paint);
    }
  }

  // Desenhar textos
  for (const t of geometry.texts) {
    paint.setColor(toColor(CK, t.color));
    canvas.save();
    if (t.rotate) {
      canvas.translate(t.x, t.baseline);
      canvas.rotate(t.rotate, 0, 0);
      canvas.drawText(t.text, 0, 0, paint, fontFor(t.font, t.size));
    } else {
      canvas.drawText(t.text, t.x, t.baseline, paint, fontFor(t.font, t.size));
    }
    canvas.restore();
  }
}

/**
 * Gera uma imagem de referência.
 */
function generateReference(CK, name, width, height, fontFor, measure) {
  console.log(`Gerando referência: ${name} (${width}x${height})`);

  const geometry = buildStampGeometry({
    content: CONTENT,
    preferences: DEFAULT_WATERMARK_PREFERENCES,
    frame: { width, height },
    colors: COLORS,
    measure,
    allowGrowth: true,
  });

  // Criar surface com fundo cinza médio (simulando uma foto)
  const surface = CK.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  canvas.clear(CK.Color(128, 128, 128, 1));

  // Desenhar o carimbo
  drawStamp(CK, canvas, geometry, fontFor);

  surface.flush();

  // Salvar como PNG
  const png = surface.makeImageSnapshot().encodeToBytes();
  const filename = `android-${name}-${width}x${height}.png`;
  const filepath = path.join(BASELINE_DIR, filename);
  
  fs.writeFileSync(filepath, Buffer.from(png));
  
  console.log(`  ✅ Salvo em: ${filepath}`);
  
  // Retornar a geometria para possíveis medições
  return { geometry, filepath };
}

/**
 * Função principal.
 */
async function main() {
  // Criar diretório de baseline
  if (!fs.existsSync(BASELINE_DIR)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
  }

  console.log('=== Gerando Imagens de Referência ===\n');

  // Inicializar CanvasKit
  const CK = await CanvasKitInit({ 
    locateFile: (f) => path.join(NM, 'canvaskit-wasm/bin', f) 
  });

  // Carregar fontes
  const typefaces = {};
  for (const [key, file] of Object.entries(FONT_FILES)) {
    typefaces[key] = CK.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(file).buffer);
    if (!typefaces[key]) throw new Error(`Skia recusou a fonte ${key}`);
  }

  const fontCache = new Map();
  const fontFor = (name, size) => {
    const key = `${name}@${size}`;
    if (!fontCache.has(key)) fontCache.set(key, new CK.Font(typefaces[name], size));
    return fontCache.get(key);
  };

  const measure = (text, size, name) => {
    const font = fontFor(name, size);
    return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((a, b) => a + b, 0);
  };

  // Gerar referências para cada foto de teste
  const results = [];
  for (const photo of TEST_PHOTOS) {
    const result = generateReference(CK, photo.name, photo.width, photo.height, fontFor, measure);
    results.push(result);
  }

  console.log('\n=== Referências Geradas ===');
  for (const result of results) {
    console.log(`  - ${path.basename(result.filepath)}`);
  }

  console.log('\n✅ Todas as referências foram geradas com sucesso!');
  console.log(`   Salvas em: ${BASELINE_DIR}/`);
}

// Executar
main().catch((error) => {
  console.error('Erro:', error.message);
  process.exit(1);
});
