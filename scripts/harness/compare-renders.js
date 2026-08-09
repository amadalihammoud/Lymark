/**
 * Compara as renderizações do carimbo entre plataformas.
 *
 * São dois portões, com rigor diferente, porque respondem a perguntas
 * diferentes.
 *
 * **Portão de geometria (exato).** Compara números, não pixels: posição,
 * baseline, corpo, espaçamento, rotação e o avanço medido de cada texto.
 * Paridade aqui é obrigatória e sem tolerância — mesmas fontes e mesmo código
 * de layout têm de produzir exatamente os mesmos números. É este portão que
 * pega o modo de falha mais perigoso: uma fonte que não carregou muda os
 * avanços de glifo e desloca tudo, sem lançar erro nenhum.
 *
 * **Portão de raster (tolerância).** Compara pixels, restrito às regiões que
 * o carimbo de fato desenha. Aqui a tolerância existe porque antialiasing e
 * desfoque divergem entre rasterizadores — perseguir zero pixel entre o Skia
 * do aparelho e o CanvasKit seria perseguir o impossível.
 *
 * Uso:
 *   node scripts/harness/compare-renders.js [--require-device]
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { default: pixelmatch } = require('pixelmatch');

const { CASES, caseId, RENDERS_DIR, REFERENCE_DIR, DIFF_DIR } = require('./lib/fixture');

/**
 * Limiares por par de plataformas.
 *
 * Node, navegador e Electron rodam o MESMO CanvasKit: divergência real ali é
 * quase nula, e o limiar é apertado. O aparelho roda o Skia nativo, sobre
 * outro rasterizador — daí o limiar mais largo.
 */
const RASTER_THRESHOLD = { sameEngine: 0.1, device: 0.5 };

/** Tolerância por canal do pixelmatch. Abaixo disto, dois tons são o mesmo. */
const PIXEL_TOLERANCE = 0.01;

const isDevice = (platform) => platform === 'android' || platform === 'ios';

function loadPlatforms() {
  const found = new Map();

  const scan = (dir, origin) => {
    if (!fs.existsSync(dir)) return;
    for (const platform of fs.readdirSync(dir)) {
      const full = path.join(dir, platform);
      if (!fs.statSync(full).isDirectory()) continue;
      const hasReport = fs.readdirSync(full).some((f) => f.endsWith('.json'));
      if (hasReport) found.set(platform, { dir: full, origin });
    }
  };

  scan(RENDERS_DIR, 'gerado');
  scan(REFERENCE_DIR, 'referência');
  return found;
}

/** Diferenças entre dois relatórios de geometria, campo a campo. */
function diffGeometry(a, b) {
  const problems = [];

  const compare = (label, x, y) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) {
      problems.push(`${label}: ${JSON.stringify(x)} != ${JSON.stringify(y)}`);
    }
  };

  compare('frame', a.frame, b.frame);
  compare('sombra', a.shadow, b.shadow);
  compare('larguraTintaRelógio', a.clockInkWidth, b.clockInkWidth);
  compare('corpoRelógio', a.clockSize, b.clockSize);
  compare('retângulos', a.rects, b.rects);

  if (a.texts.length !== b.texts.length) {
    problems.push(`quantidade de textos: ${a.texts.length} != ${b.texts.length}`);
    return problems;
  }

  a.texts.forEach((ta, i) => {
    const tb = b.texts[i];
    for (const key of ['text', 'x', 'baseline', 'size', 'font', 'color', 'letterSpacing', 'rotate', 'advance']) {
      if (JSON.stringify(ta[key]) !== JSON.stringify(tb[key])) {
        problems.push(`texto[${i}] "${String(ta.text).slice(0, 18)}" ${key}: ${ta[key]} != ${tb[key]}`);
      }
    }
  });

  return problems;
}

/** Fração de pixels divergentes dentro das regiões desenhadas pelo carimbo. */
function diffRaster(imgA, imgB, regions, diffPath) {
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(`dimensões diferentes: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`);
  }

  const full = new PNG({ width: imgA.width, height: imgA.height });
  pixelmatch(imgA.data, imgB.data, full.data, imgA.width, imgA.height, {
    threshold: PIXEL_TOLERANCE,
  });

  // Só os pixels dentro das regiões entram na conta. Um `Set` evita contar
  // duas vezes onde duas regiões se sobrepõem.
  const counted = new Set();
  let differing = 0;

  for (const r of regions) {
    for (let y = r.y; y < r.y + r.height && y < imgA.height; y++) {
      for (let x = r.x; x < r.x + r.width && x < imgA.width; x++) {
        const key = y * imgA.width + x;
        if (counted.has(key)) continue;
        counted.add(key);
        // O pixelmatch marca divergência em vermelho puro.
        const i = key * 4;
        if (full.data[i] === 255 && full.data[i + 1] === 0 && full.data[i + 2] === 0) differing++;
      }
    }
  }

  if (diffPath) {
    fs.mkdirSync(path.dirname(diffPath), { recursive: true });
    fs.writeFileSync(diffPath, PNG.sync.write(full));
  }

  return { percent: counted.size ? (differing / counted.size) * 100 : 0, pixels: counted.size };
}

function main() {
  const requireDevice = process.argv.includes('--require-device');
  const platforms = loadPlatforms();

  console.log('=== Harness de fidelidade do carimbo ===\n');

  if (platforms.size === 0) {
    console.error('Nenhuma renderização encontrada. Rode antes: node scripts/harness/render-node.js');
    process.exit(1);
  }

  for (const [name, info] of platforms) {
    console.log(`  ${name.padEnd(10)} ${info.origin.padEnd(11)} ${info.dir}`);
  }

  const names = [...platforms.keys()];
  const devicePresent = names.some(isDevice);

  console.log('');
  if (!devicePresent) {
    const aviso =
      'ATENÇÃO: nenhuma referência de aparelho. A paridade com o mobile NÃO está verificada —\n' +
      '         apenas a consistência entre motores CanvasKit. Veja reference/android/README.md.';
    if (requireDevice) {
      console.error(aviso.replace('ATENÇÃO', 'FALHA  '));
      process.exit(1);
    }
    console.log(aviso + '\n');
  }

  if (names.length < 2) {
    console.error(`Só uma plataforma (${names[0]}). Comparar exige duas.`);
    process.exit(1);
  }

  let failures = 0;
  let comparisons = 0;

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      const crossEngine = isDevice(a) || isDevice(b);
      const limit = crossEngine ? RASTER_THRESHOLD.device : RASTER_THRESHOLD.sameEngine;

      console.log(`--- ${a} vs ${b}  (limiar de raster ${limit}%) ---`);

      for (const c of CASES) {
        const id = caseId(c);
        const reportA = path.join(platforms.get(a).dir, `${id}.json`);
        const reportB = path.join(platforms.get(b).dir, `${id}.json`);
        if (!fs.existsSync(reportA) || !fs.existsSync(reportB)) {
          console.log(`  ${id.padEnd(22)} ausente em uma das plataformas — pulado`);
          continue;
        }

        comparisons++;
        const ra = JSON.parse(fs.readFileSync(reportA, 'utf8'));
        const rb = JSON.parse(fs.readFileSync(reportB, 'utf8'));

        const geoProblems = diffGeometry(ra, rb);
        if (geoProblems.length) {
          failures++;
          console.log(`  ${id.padEnd(22)} GEOMETRIA DIVERGE (${geoProblems.length}):`);
          geoProblems.slice(0, 6).forEach((p) => console.log(`      ${p}`));
          if (geoProblems.length > 6) console.log(`      ... mais ${geoProblems.length - 6}`);
          continue;
        }

        const pngA = path.join(platforms.get(a).dir, `${id}.png`);
        const pngB = path.join(platforms.get(b).dir, `${id}.png`);
        if (!fs.existsSync(pngA) || !fs.existsSync(pngB)) {
          console.log(`  ${id.padEnd(22)} geometria OK; imagem ausente — raster não verificado`);
          continue;
        }

        const { percent, pixels } = diffRaster(
          PNG.sync.read(fs.readFileSync(pngA)),
          PNG.sync.read(fs.readFileSync(pngB)),
          ra.regions,
          path.join(DIFF_DIR, `${a}-vs-${b}-${id}.png`),
        );

        const ok = percent <= limit;
        if (!ok) failures++;
        console.log(
          `  ${id.padEnd(22)} geometria OK · raster ${percent.toFixed(3)}% ` +
            `de ${pixels.toLocaleString('pt-BR')} px  ${ok ? 'OK' : 'FALHA'}`,
        );
      }
      console.log('');
    }
  }

  console.log(`=== ${comparisons} comparações, ${failures} falha(s) ===`);
  process.exit(failures ? 1 : 0);
}

main();
