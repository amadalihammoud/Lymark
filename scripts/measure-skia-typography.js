/**
 * Mede a tipografia no próprio motor Skia.
 *
 * O `canvaskit-wasm` que acompanha o react-native-skia é o mesmo Skia que
 * roda no aparelho. Medir aqui não é aproximação: é o motor de produção
 * respondendo em que ponto a tinta começa e termina.
 *
 * O método é o mesmo usado contra a referência: desenhar, ler os pixels e
 * achar a caixa de tinta — em vez de confiar em ascent/descent, que
 * descrevem a fonte e não os glifos efetivamente desenhados.
 */
const fs = require('fs');
const path = require('path');

const NM = path.join(__dirname, '..', 'node_modules');
const CanvasKitInit = require(path.join(NM, 'canvaskit-wasm/bin/canvaskit.js'));

const FONTS = {
  clock: `${NM}/@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf`,
  body: `${NM}/@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf`,
  medium: `${NM}/@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf`,
};

/** Caixa da tinta de fato desenhada, relativa à linha de base. */
function inkBox(CanvasKit, typeface, size, text) {
  const pad = Math.ceil(size * 1.5);
  const W = Math.ceil(size * text.length * 1.2) + pad * 2;
  const H = Math.ceil(size * 3);
  const baselineY = Math.round(H / 2);

  const surface = CanvasKit.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.TRANSPARENT);

  const font = new CanvasKit.Font(typeface, size);
  const paint = new CanvasKit.Paint();
  paint.setColor(CanvasKit.WHITE);
  paint.setAntiAlias(true);

  canvas.drawText(text, pad, baselineY, paint, font);
  surface.flush();

  const px = canvas.readPixels(0, 0, {
    width: W,
    height: H,
    colorType: CanvasKit.ColorType.RGBA_8888,
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
  });

  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Limiar baixo: a antialiasing das bordas ainda é tinta.
      if (px[(y * W + x) * 4 + 3] > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  const metrics = font.getMetrics();
  const advance = font.getGlyphWidths(font.getGlyphIDs(text)).reduce((a, b) => a + b, 0);

  font.delete();
  paint.delete();
  surface.delete();

  return {
    inkTopFromBaseline: top - baselineY,
    inkHeight: bottom - top + 1,
    inkWidth: right - left + 1,
    advance,
    ascent: metrics.ascent,
    descent: metrics.descent,
  };
}

CanvasKitInit({ locateFile: (f) => path.join(NM, 'canvaskit-wasm/bin', f) }).then((CanvasKit) => {
  const tf = {};
  for (const [k, p] of Object.entries(FONTS)) {
    tf[k] = CanvasKit.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(p).buffer);
    if (!tf[k]) throw new Error(`Skia recusou a fonte ${k}`);
  }

  const S = 400; // corpo grande: reduz o erro de arredondamento das razões

  // Extensão dos algarismos, e não do horário exibido: a barra âmbar não pode
  // mudar de altura quando o relógio passa de 11:11 para 07:42.
  const digits = inkBox(CanvasKit, tf.clock, S, '0123456789');
  const sample = inkBox(CanvasKit, tf.clock, S, '21:55');

  console.log('=== Pathway Gothic One @', S, '===');
  console.log('algarismos  topo/base a partir da linha de base:',
    digits.inkTopFromBaseline, '/', digits.inkTopFromBaseline + digits.inkHeight);
  console.log('TIME_INK_TOP_FROM_BASELINE_RATIO =',
    (digits.inkTopFromBaseline / S).toFixed(4));
  console.log('TIME_INK_HEIGHT_RATIO            =', (digits.inkHeight / S).toFixed(4));
  console.log('"21:55" largura de tinta:', sample.inkWidth, ' avanço:', sample.advance.toFixed(1));
  console.log('proporção avanço/corpo   :', (sample.advance / S).toFixed(4));

  for (const [name, key] of [['Barlow 400', 'body'], ['Barlow 500', 'medium']]) {
    const b = inkBox(CanvasKit, tf[key], S, 'Hxg');
    console.log(`--- ${name}: ascent ${b.ascent.toFixed(1)} descent ${b.descent.toFixed(1)}`);
  }

  // Verificação contra a referência: normalizada a 1128 px de largura, a hora
  // media 219 px. O corpo equivalente vem da razão calibrada 47/330.
  const sizeAt1128 = (47 / 355.4) * 1128;
  const check = inkBox(CanvasKit, tf.clock, sizeAt1128, '21:55');
  console.log('\n=== verificação contra a referência (imagem de 1128 px) ===');
  console.log('corpo equivalente        :', sizeAt1128.toFixed(1));
  console.log('largura de "21:55" medida:', check.inkWidth, '| alvo da referência: 219');
});
