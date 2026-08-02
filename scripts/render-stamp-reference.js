/**
 * Renderiza o carimbo no Skia, fora do aparelho, e confere contra a referência.
 *
 * A geometria de `stamp-layout.ts` não depende de motor gráfico: recebe uma
 * função de medição e devolve posições absolutas. Isso permite desenhá-la aqui,
 * no mesmo Skia que roda no telefone, e verificar antes de qualquer build que
 * a hora ocupa a largura medida na referência e que a barra âmbar casa com a
 * tinta dos algarismos.
 *
 *   npx tsc -p tsconfig.calib.json && node scripts/render-stamp-reference.js
 *
 * O arquivo `tsconfig.calib.json` compila apenas o layout para CommonJS; ver
 * o cabeçalho de `measure-skia-typography.js` para o restante do método.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const BUILD = process.env.LYMARK_CALIB_BUILD || '/tmp/lymark-build';

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

const FONT_FILES = {
  clock: `${NM}/@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf`,
  body: `${NM}/@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf`,
  medium: `${NM}/@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf`,
};

/** Largura da imagem usada na medição da referência. */
const WIDTH = 1128;
const HEIGHT = Math.round((WIDTH * 4) / 3);

const CONTENT = {
  time: '21:55',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
  code: '98926A73655DC1',
  showRule: true,
  isEmpty: false,
};

CanvasKitInit({ locateFile: (f) => path.join(NM, 'canvaskit-wasm/bin', f) }).then((CK) => {
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

  // Avanço, e não caixa de tinta: é o avanço que determina onde o próximo
  // elemento começa, e portanto é ele que o layout precisa conhecer.
  const measure = (text, size, name) => {
    const font = fontFor(name, size);
    return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((a, b) => a + b, 0);
  };

  const geometry = buildStampGeometry({
    content: CONTENT,
    preferences: DEFAULT_WATERMARK_PREFERENCES,
    frame: { width: WIDTH, height: HEIGHT },
    colors: { text: '#FFFFFF', accent: '#F5B60D', backdrop: 'rgba(0,0,0,0.75)' },
    measure,
    allowGrowth: true,
  });

  const surface = CK.MakeSurface(WIDTH, HEIGHT);
  const canvas = surface.getCanvas();
  // Cinza médio no lugar da fotografia: o carimbo é branco com sombra, e
  // sobre preto não se enxergaria a borda da tinta.
  canvas.clear(CK.Color(60, 72, 86, 1));

  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  /** A geometria carrega a cor de cada traçado; o desenho precisa respeitá-la. */
  const toColor = (value) => {
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
  };

  for (const rect of geometry.rects) {
    paint.setColor(toColor(rect.color));
    canvas.drawRect(CK.XYWHRect(rect.x, rect.y, rect.width, rect.height), paint);
  }

  for (const t of geometry.texts) {
    paint.setColor(toColor(t.color));
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

  surface.flush();

  const png = surface.makeImageSnapshot().encodeToBytes();
  const out = path.join(process.env.LYMARK_CALIB_OUT || '/tmp', 'stamp-reference.png');
  fs.writeFileSync(out, Buffer.from(png));

  const time = geometry.texts.find((t) => t.text === CONTENT.time);
  const rule = geometry.rects.find((r) => r.color === '#F5B60D');

  /**
   * A referência foi medida em **tinta**, não em avanço: o alvo de 219 px é a
   * largura do traçado visível. Avanço inclui as folgas laterais dos glifos e
   * daria 5,9% a mais nesta fonte — comparar os dois seria erro de aferição.
   */
  const inkWidth = (() => {
    const pad = Math.ceil(time.size);
    const w = Math.ceil(time.size * 3) + pad * 2;
    const h = Math.ceil(time.size * 3);
    const s = CK.MakeSurface(w, h);
    const c = s.getCanvas();
    c.clear(CK.TRANSPARENT);
    const p = new CK.Paint();
    p.setColor(CK.WHITE);
    p.setAntiAlias(true);
    c.drawText(time.text, pad, Math.round(h / 2), p, fontFor('clock', time.size));
    s.flush();
    const px = c.readPixels(0, 0, {
      width: w, height: h,
      colorType: CK.ColorType.RGBA_8888,
      alphaType: CK.AlphaType.Unpremul,
      colorSpace: CK.ColorSpace.SRGB,
    });
    let l = Infinity, r = -Infinity;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (px[(y * w + x) * 4 + 3] > 8) {
          if (x < l) l = x;
          if (x > r) r = x;
        }
      }
    }
    p.delete(); s.delete();
    return r - l + 1;
  })();

  console.log('=== carimbo desenhado em', WIDTH, 'x', HEIGHT, '===');
  console.log('corpo da hora            :', time.size);
  console.log('tinta de "21:55"         :', inkWidth, '| alvo da referência: 219');
  console.log('desvio                   :', (((inkWidth - 219) / 219) * 100).toFixed(1), '%');
  console.log('avanço (para o layout)   :', measure(time.text, time.size, 'clock').toFixed(1));
  console.log('barra: topo', rule.y.toFixed(1), 'altura', rule.height.toFixed(1));
  console.log('tinta: topo', (time.baseline - time.size * 0.715).toFixed(1),
    'altura', (time.size * 0.73).toFixed(1));
  console.log('elementos                :', geometry.texts.length, 'textos,',
    geometry.rects.length, 'retângulos');
  console.log('arquivo                  :', out);
});
