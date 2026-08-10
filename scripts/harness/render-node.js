/**
 * Renderiza o carimbo no Node, pelo caminho de código do próprio aplicativo.
 *
 * Espelha `renderStampedPhoto` passo a passo — decodifica, cria a surface no
 * tamanho da foto, desenha a imagem, monta a geometria com `allowGrowth` e
 * chama o `draw` real. O que muda é só a codificação final: PNG em vez de
 * JPEG, para que a comparação não some o ruído do compressor ao que o carimbo
 * desenhou.
 *
 * Além da imagem, grava um relatório de geometria. É ele que sustenta o
 * portão exato: se uma fonte não carregar, os avanços de glifo mudam e todo
 * `x` do relatório muda junto — detectável sem comparar um pixel sequer.
 *
 * Uso:
 *   npx tsc -p tsconfig.harness.json
 *   node scripts/harness/render-node.js
 */

const fs = require('fs');
const path = require('path');

const { createNodeStampRenderer, BUILD } = require('./lib/skia-node');
const { METADATA, CASES, photoFile, caseId, RENDERS_DIR } = require('./lib/fixture');

const OUT_DIR = path.join(RENDERS_DIR, 'node');

/**
 * Extrai do desenho os números que o portão exato compara.
 *
 * A caixa do carimbo sai da geometria, e não de um palpite sobre a posição:
 * o harness anterior recortava o canto inferior direito em no máximo 500x400
 * e chamava aquilo de "área do carimbo".
 */
function buildReport(geometry, measure, frame) {
  // Uma região por elemento desenhado, e não uma caixa única. A marca fica no
  // topo e o carimbo embaixo: a união dos dois cobriria a imagem inteira, e
  // comparar "a área do carimbo" viraria comparar a foto toda — o sinal do
  // carimbo se perderia no meio de milhões de pixels de fotografia.
  const regions = [];

  // Margem para o borrão da sombra, que extrapola a caixa do glifo.
  const pad = Math.ceil(geometry.shadow.blur + Math.abs(geometry.shadow.offsetY) + 2);

  const addRegion = (x, y, w, h) => {
    const rx = Math.max(0, Math.floor(x) - pad);
    const ry = Math.max(0, Math.floor(y) - pad);
    regions.push({
      x: rx,
      y: ry,
      width: Math.max(1, Math.min(frame.width - rx, Math.ceil(w) + pad * 2)),
      height: Math.max(1, Math.min(frame.height - ry, Math.ceil(h) + pad * 2)),
    });
  };

  for (const r of geometry.rects) addRegion(r.x, r.y, r.width, r.height);

  const texts = geometry.texts.map((t) => {
    const advance = measure(t.text, t.size, t.font);
    const spacing = (t.letterSpacing ?? 0) * Math.max(0, t.text.length - 1);
    const width = advance + spacing;
    // Sem rotação a caixa é direta; com rotação, alarga-se para o maior lado
    // para não subestimar a área tocada.
    const reach = t.rotate ? Math.max(width, t.size) : width;
    addRegion(t.x, t.baseline - t.size, reach, t.size * 1.35);
    return {
      text: t.text,
      x: t.x,
      baseline: t.baseline,
      size: t.size,
      font: t.font,
      color: t.color,
      letterSpacing: t.letterSpacing ?? 0,
      rotate: t.rotate ?? 0,
      advance: Number(advance.toFixed(4)),
    };
  });

  const clock = geometry.texts.find((t) => t.font === 'clock');

  return {
    frame,
    regions,
    shadow: geometry.shadow,
    // Largura de tinta do relógio: a mesma grandeza que a calibragem afere.
    clockInkWidth: clock ? Number(measure(clock.text, clock.size, 'clock').toFixed(4)) : null,
    clockSize: clock ? clock.size : null,
    rects: geometry.rects.map((r) => ({
      x: r.x, y: r.y, width: r.width, height: r.height, color: r.color, radius: r.radius ?? 0,
    })),
    texts,
  };
}

async function main() {
  if (!fs.existsSync(path.join(BUILD, 'src/features/watermark/skia-stamp.js'))) {
    console.error('Build ausente. Rode antes:  npx tsc -p tsconfig.harness.json');
    process.exit(1);
  }

  const { Skia, CanvasKit, renderer } = await createNodeStampRenderer();

  const { buildStampGeometry } = require(path.join(BUILD, 'src/features/watermark/stamp-layout.js'));
  const { buildWatermarkContent } = require(path.join(BUILD, 'src/features/watermark/build-content.js'));
  const { DEFAULT_WATERMARK_PREFERENCES } = require(path.join(BUILD, 'src/features/watermark/preferences.js'));
  const { STAMP_COLORS } = require(path.join(BUILD, 'src/features/watermark/stamp-colors.js'));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('=== Renderizando no Node, com o desenhista real do app ===\n');

  for (const c of CASES) {
    const source = photoFile(c);
    if (!fs.existsSync(source)) {
      console.error(`Foto de teste ausente: ${source}`);
      console.error('Rode antes: node scripts/harness/make-test-photos.js');
      process.exit(1);
    }

    const data = Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(source)));
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error(`Não foi possível decodificar ${source}`);

    const width = image.width();
    const height = image.height();
    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) throw new Error(`Surface de ${width}x${height} recusada (limite de memória)`);

    const canvas = surface.getCanvas();
    canvas.drawImage(image, 0, 0);

    const geometry = buildStampGeometry({
      content: buildWatermarkContent(METADATA, DEFAULT_WATERMARK_PREFERENCES),
      preferences: DEFAULT_WATERMARK_PREFERENCES,
      frame: { width, height },
      colors: STAMP_COLORS,
      measure: renderer.measure,
      allowGrowth: true,
    });

    renderer.draw(canvas, geometry);

    // Sem argumento o Skia codifica em PNG, que é o que o harness quer.
    const bytes = surface.makeImageSnapshot().encodeToBytes();
    if (!bytes) throw new Error('Falha ao codificar o resultado');

    const id = caseId(c);
    fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), Buffer.from(bytes));

    const report = buildReport(geometry, renderer.measure, { width, height });
    fs.writeFileSync(
      path.join(OUT_DIR, `${id}.json`),
      JSON.stringify({ platform: 'node', case: id, ...report }, null, 2),
    );

    const covered = report.regions.reduce((sum, r) => sum + r.width * r.height, 0);
    console.log(
      `  ${id}  ${report.regions.length} regiões cobrindo ` +
        `${((covered / (width * height)) * 100).toFixed(1)}% da imagem  ` +
        `relógio ${report.clockInkWidth}px  ${geometry.texts.length} textos`,
    );

    surface.dispose();
    image.dispose();
  }

  console.log(`\nSaída em ${OUT_DIR}`);
}

main().catch((e) => {
  console.error('Falhou:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
