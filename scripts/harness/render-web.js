/**
 * Renderiza o carimbo para a plataforma web usando o mesmo CanvasKit.
 *
 * Este script simula o que o app web produziria, para que possamos
 * comparar com a referência Android.
 *
 * Uso:
 *   LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/render-web.js
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const NM = path.join(ROOT, 'node_modules');
const BUILD = process.env.LYMARK_CALIB_BUILD || '/tmp/lymark-build';
const OUTPUT_DIR = path.join(__dirname, 'output');

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

const TEST_PHOTOS = [
  { name: 'portrait', width: 3000, height: 4000 },
  { name: 'landscape', width: 4000, height: 3000 },
  { name: 'square', width: 2000, height: 2000 },
  { name: 'highres', width: 6000, height: 4000 },
];

const CONTENT = {
  time: '21:55',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
  showRule: true,
  isEmpty: false,
};

const COLORS = {
  text: '#FFFFFF',
  accent: '#F5B60D',
  backdrop: 'rgba(0,0,0,0.75)',
  palette: stampPalette,
};

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

function drawStamp(CK, canvas, geometry, fontFor) {
  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  for (const rect of geometry.rects) {
    paint.setColor(toColor(CK, rect.color));
    const area = CK.XYWHRect(rect.x, rect.y, rect.width, rect.height);
    if (rect.radius) {
      canvas.drawRRect(CK.RRectXY(area, rect.radius, rect.radius), paint);
    } else {
      canvas.drawRect(area, paint);
    }
  }

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

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('=== Renderizando para Web ===\n');

  const CK = await CanvasKitInit({ 
    locateFile: (f) => path.join(NM, 'canvaskit-wasm/bin', f) 
  });

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

  for (const photo of TEST_PHOTOS) {
    console.log(`Renderizando: ${photo.name} (${photo.width}x${photo.height})`);

    const geometry = buildStampGeometry({
      content: CONTENT,
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame: { width: photo.width, height: photo.height },
      colors: COLORS,
      measure,
      allowGrowth: true,
    });

    const surface = CK.MakeSurface(photo.width, photo.height);
    const canvas = surface.getCanvas();
    canvas.clear(CK.Color(128, 128, 128, 1));

    drawStamp(CK, canvas, geometry, fontFor);

    surface.flush();

    const png = surface.makeImageSnapshot().encodeToBytes();
    const filename = `web-${photo.name}-${photo.width}x${photo.height}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    fs.writeFileSync(filepath, Buffer.from(png));
    
    console.log(`  ✅ Salvo em: ${filepath}`);
  }

  console.log('\n✅ Todas as renderizações web foram geradas!');
  console.log(`   Salvas em: ${OUTPUT_DIR}/`);
}

main().catch((error) => {
  console.error('Erro:', error.message);
  process.exit(1);
});
