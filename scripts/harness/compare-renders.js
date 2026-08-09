/**
 * Harness de comparação de renderizações do carimbo.
 *
 * Compara a referência Android (baseline) com as renderizações web e desktop
 * usando pixelmatch para detectar divergências de pixel.
 *
 * Uso:
 *   node scripts/harness/compare-renders.js
 *
 * Requisitos:
 *   - As imagens de referência devem estar em scripts/harness/baseline/
 *   - As imagens a comparar devem estar em scripts/harness/output/
 *   - Formato: {plataforma}-{foto}-{resolucao}.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { default: pixelmatch } = require('pixelmatch');

const HARNESS_DIR = path.join(__dirname);
const BASELINE_DIR = path.join(HARNESS_DIR, 'baseline');
const OUTPUT_DIR = path.join(HARNESS_DIR, 'output');
const DIFF_DIR = path.join(HARNESS_DIR, 'diff');

// Limiares de aceitação (em % de pixels divergentes)
const THRESHOLDS = {
  stampArea: 0.5,    // Dentro da área do carimbo
  outsideStamp: 1.0,  // Fora do carimbo (recompressão JPEG)
  inkWidth: 0,       // Largura da tinta do relógio - deve ser exata
  barPosition: 0,    // Posição da barra âmbar - deve ser exata
  barHeight: 0,      // Altura da barra âmbar - deve ser exata
  baseline: 0,        // Baseline do texto - deve ser exata
};

// Cores para o diff (vermelho para divergências)
const DIFF_COLOR = { r: 255, g: 0, b: 0, a: 255 };

/**
 * Carrega uma imagem PNG como buffer de pixels.
 */
function loadPNG(filePath) {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

/**
 * Salva uma imagem PNG.
 */
function savePNG(filePath, png) {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Compara duas imagens e retorna a porcentagem de pixels diferentes.
 */
function compareImages(img1, img2, diffPath = null) {
  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(`Dimensões diferentes: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`);
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });
  
  const pixelsDiff = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.01 } // 1% de tolerância por canal
  );

  if (diffPath) {
    savePNG(diffPath, diff);
  }

  const totalPixels = width * height;
  return (pixelsDiff / totalPixels) * 100;
}

/**
 * Extrai a área do carimbo da imagem.
 * Por enquanto, usa uma estimativa baseada na posição do carimbo.
 * TODO: Extrair do layout real
 */
function extractStampArea(image, geometry) {
  // Se tivermos a geometria, usamos as coordenadas reais
  if (geometry) {
    // Encontrar os limites do carimbo
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const rect of geometry.rects || []) {
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    
    for (const text of geometry.texts || []) {
      // Estimativa da área do texto
      minX = Math.min(minX, text.x);
      minY = Math.min(minY, text.baseline - text.size);
      maxX = Math.max(maxX, text.x + text.size * text.text.length);
      maxY = Math.max(maxY, text.baseline);
    }
    
    if (minX !== Infinity) {
      return {
        x: Math.max(0, minX - 10),
        y: Math.max(0, minY - 10),
        width: Math.min(image.width - minX + 20, maxX - minX + 20),
        height: Math.min(image.height - minY + 20, maxY - minY + 20),
      };
    }
  }
  
  // Fallback: usar a parte inferior direita (posição padrão do carimbo)
  const stampWidth = Math.min(image.width * 0.4, 500);
  const stampHeight = Math.min(image.height * 0.3, 400);
  return {
    x: image.width - stampWidth - 20,
    y: image.height - stampHeight - 20,
    width: stampWidth,
    height: stampHeight,
  };
}

/**
 * Recorta uma região de uma imagem.
 */
function cropImage(image, region) {
  const cropped = new PNG({
    width: region.width,
    height: region.height,
  });
  
  for (let y = 0; y < region.height; y++) {
    for (let x = 0; x < region.width; x++) {
      const srcX = region.x + x;
      const srcY = region.y + y;
      
      if (srcX >= 0 && srcX < image.width && srcY >= 0 && srcY < image.height) {
        const srcIdx = (srcY * image.width + srcX) * 4;
        const dstIdx = (y * region.width + x) * 4;
        
        cropped.data[dstIdx] = image.data[srcIdx];
        cropped.data[dstIdx + 1] = image.data[srcIdx + 1];
        cropped.data[dstIdx + 2] = image.data[srcIdx + 2];
        cropped.data[dstIdx + 3] = image.data[srcIdx + 3];
      }
    }
  }
  
  return cropped;
}

/**
 * Compara uma imagem com a referência, focando na área do carimbo.
 */
function compareWithBaseline(baselinePath, testPath, outputName, geometry = null) {
  console.log(`\nComparando: ${path.basename(baselinePath)} vs ${path.basename(testPath)}`);
  
  const baseline = loadPNG(baselinePath);
  const test = loadPNG(testPath);
  
  // Criar diretórios se não existirem
  if (!fs.existsSync(DIFF_DIR)) {
    fs.mkdirSync(DIFF_DIR, { recursive: true });
  }
  
  // Comparar imagem toda
  const diffPath = path.join(DIFF_DIR, `${outputName}-full-diff.png`);
  const overallDiffPercent = compareImages(baseline, test, diffPath);
  console.log(`  Divergência geral: ${overallDiffPercent.toFixed(2)}%`);
  
  // Comparar apenas a área do carimbo
  const stampArea = extractStampArea(baseline, geometry);
  console.log(`  Área do carimbo: ${stampArea.x},${stampArea.y} ${stampArea.width}x${stampArea.height}`);
  
  // Extrair áreas do carimbo
  const baselineStamp = cropImage(baseline, stampArea);
  const testStamp = cropImage(test, stampArea);
  const stampDiffPath = path.join(DIFF_DIR, `${outputName}-stamp-diff.png`);
  const stampDiffPercent = compareImages(baselineStamp, testStamp, stampDiffPath);
  console.log(`  Divergência no carimbo: ${stampDiffPercent.toFixed(2)}%`);
  
  // Verificar se passa nos limiares
  const passesStampThreshold = stampDiffPercent <= THRESHOLDS.stampArea;
  const passesOverallThreshold = overallDiffPercent <= THRESHOLDS.outsideStamp;
  
  return {
    overallDiffPercent,
    stampDiffPercent,
    passesStampThreshold,
    passesOverallThreshold,
    diffImages: {
      full: diffPath,
      stamp: stampDiffPath,
    },
  };
}

/**
 * Executa o harness completo.
 */
function runHarness() {
  console.log('=== Lymark Render Harness ===\n');
  
  // Verificar se os diretórios existem
  if (!fs.existsSync(BASELINE_DIR)) {
    console.log('⚠️  Diretório de baseline não encontrado. Criando estrutura...');
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
    console.log(`   Crie as imagens de referência em: ${BASELINE_DIR}/`);
    console.log('   Formato sugerido: android-{foto}-{resolucao}.png');
    return;
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log('⚠️  Diretório de output não encontrado. Criando...');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`   Coloque as imagens a testar em: ${OUTPUT_DIR}/`);
    console.log('   Formato sugerido: web-{foto}-{resolucao}.png');
    return;
  }
  
  // Listar arquivos de baseline
  const baselineFiles = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png'));
  const outputFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  
  console.log(`Baseline: ${baselineFiles.length} imagens`);
  console.log(`Output: ${outputFiles.length} imagens\n`);
  
  // Para cada baseline, procurar correspondente no output
  const results = [];
  
  for (const baselineFile of baselineFiles) {
    const platform = baselineFile.split('-')[0]; // android, web, desktop
    const rest = baselineFile.slice(platform.length + 1);
    
    // Procurar arquivos correspondentes em outras plataformas
    for (const otherPlatform of ['web', 'desktop']) {
      if (otherPlatform === platform) continue;
      
      const testFile = `${otherPlatform}-${rest}`;
      const testPath = path.join(OUTPUT_DIR, testFile);
      
      if (fs.existsSync(testPath)) {
        const baselinePath = path.join(BASELINE_DIR, baselineFile);
        const result = compareWithBaseline(
          baselinePath,
          testPath,
          `${otherPlatform}-vs-${platform}-${rest.replace('.png', '')}`
        );
        results.push({ platform, otherPlatform, ...result });
      }
    }
  }
  
  // Resumo
  console.log('\n=== Resumo ===');
  let allPassed = true;
  for (const result of results) {
    const status = result.passesStampThreshold && result.passesOverallThreshold ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.otherPlatform} vs ${result.platform}: ` +
      `carimbo=${result.stampDiffPercent.toFixed(2)}%, geral=${result.overallDiffPercent.toFixed(2)}%`);
    if (!result.passesStampThreshold || !result.passesOverallThreshold) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n✅ Todas as comparações passaram nos limiares!');
    process.exit(0);
  } else {
    console.log('\n❌ Algumas comparações falharam. Verifique os arquivos diff gerados.');
    process.exit(1);
  }
}

// Executar
try {
  runHarness();
} catch (error) {
  console.error('Erro ao executar harness:', error.message);
  console.error(error.stack);
  process.exit(1);
}
