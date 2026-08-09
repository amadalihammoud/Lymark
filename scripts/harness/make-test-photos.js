/**
 * Gera as fotos de teste do harness, uma única vez, para serem versionadas.
 *
 * São sintéticas de propósito: precisam ser byte a byte idênticas em toda
 * plataforma, e uma fotografia real traria metadados e recompressão que
 * variam com o aparelho. O desenho tem gradiente, bordas duras e ruído fino
 * porque o carimbo precisa ser julgado sobre fundo claro, escuro e texturizado
 * — sobre cinza chapado, um erro de sombra passa despercebido.
 *
 * Uso:  node scripts/harness/make-test-photos.js
 */

const fs = require('fs');
const path = require('path');

const { CASES, PHOTOS_DIR, photoFile } = require('./lib/fixture');

const NM = path.join(__dirname, '..', '..', 'node_modules');

/** Ruído determinístico: sem Math.random, senão as fotos mudam a cada execução. */
function noiseAt(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

async function main() {
  const CanvasKitInit = require(path.join(NM, 'canvaskit-wasm/bin/canvaskit.js'));
  const CK = await CanvasKitInit({
    locateFile: (f) => path.join(NM, 'canvaskit-wasm/bin', f),
  });

  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  for (const c of CASES) {
    const surface = CK.MakeSurface(c.width, c.height);
    const canvas = surface.getCanvas();
    const paint = new CK.Paint();
    paint.setAntiAlias(true);

    // Gradiente diagonal: dá ao carimbo fundo claro de um lado e escuro do outro.
    paint.setShader(
      CK.Shader.MakeLinearGradient(
        [0, 0],
        [c.width, c.height],
        [CK.Color(240, 236, 225, 1), CK.Color(28, 42, 64, 1)],
        null,
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawRect(CK.XYWHRect(0, 0, c.width, c.height), paint);
    paint.setShader(null);

    // Faixas claras cruzando a área do carimbo, para expor falha de sombra.
    const band = new CK.Paint();
    band.setAntiAlias(true);
    band.setColor(CK.Color(255, 255, 255, 0.55));
    const step = Math.round(c.height / 14);
    for (let i = 0; i < 14; i += 2) {
      band.setColor(CK.Color(255, 255, 255, i % 4 === 0 ? 0.5 : 0.22));
      canvas.drawRect(CK.XYWHRect(0, i * step, c.width, Math.round(step * 0.7)), band);
    }

    // Ruído fino, para que a recompressão JPEG tenha o que fazer.
    const dot = new CK.Paint();
    const stepN = Math.max(6, Math.round(c.width / 260));
    for (let y = 0; y < c.height; y += stepN) {
      for (let x = 0; x < c.width; x += stepN) {
        const v = noiseAt(x / stepN, y / stepN);
        dot.setColor(CK.Color(0, 0, 0, v * 0.10));
        canvas.drawRect(CK.XYWHRect(x, y, stepN, stepN), dot);
      }
    }

    surface.flush();
    const bytes = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.PNG, 100);
    if (!bytes) throw new Error(`Falha ao codificar ${c.name}`);

    const out = photoFile(c);
    fs.writeFileSync(out, Buffer.from(bytes));
    console.log(`  ${path.basename(out)}  ${(bytes.length / 1024).toFixed(0)} KB`);

    surface.delete();
  }

  console.log(`\nFotos de teste em ${PHOTOS_DIR}`);
  console.log('Versione-as: todas as plataformas precisam dos MESMOS bytes.');
}

main().catch((e) => {
  console.error('Falhou:', e.message);
  process.exit(1);
});
