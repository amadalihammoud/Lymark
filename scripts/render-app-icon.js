/**
 * Desenha os ícones do aplicativo a partir de uma geometria só.
 *
 * O ícone anterior era um "L" branco ao lado de uma barra âmbar vertical, e
 * era lido como **LI**. A barra vinha do próprio carimbo — é a mesma que
 * acompanha a tinta dos algarismos da hora —, mas isolada ao lado de um L ela
 * vira uma letra que não existe no nome.
 *
 * Aqui a barra passa a ser a **haste do "y"**: continua vertical, âmbar, com a
 * mesma espessura, e ganha o braço diagonal e a descendente que faltavam para
 * a palavra ser "Ly". O que muda é o significado do traço, não o traço.
 *
 * As proporções são as medidas do arquivo antigo, em unidades de altura de
 * caixa alta — foi assim que a espessura da haste, a altura do pé do L e a
 * largura do conjunto sobreviveram à mudança:
 *
 *   haste do L  0,239    pé do L      0,234    largura do L  0,619
 *   traço âmbar 0,172    altura de x  0,733    descendente   0,281
 *
 * A descendente sai da métrica da própria fonte do aplicativo, já medida em
 * `measure-skia-typography.js`: caixa alta a 0,710 do corpo e descendentes a
 * 0,200 abaixo da linha de base — 0,200 / 0,710 = 0,281 da caixa alta.
 *
 *   node scripts/render-app-icon.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const OUT = process.env.LYMARK_ICON_OUT || path.join(ROOT, 'assets', 'images');

const CanvasKitInit = require(path.join(NM, 'canvaskit-wasm/bin/canvaskit.js'));

const NAVY = '#0D2137';
const WHITE = '#FFFFFF';
const AMBER = '#F5B60D';

/** Tudo em unidades de altura de caixa alta, medido no ícone anterior. */
const G = {
  lStem: 103 / 431,
  lFoot: 101 / 431,
  lWidth: 267 / 431,
  stroke: 74 / 431,
  descender: 121 / 431,

  /*
   * Estas três são as que o "y" trouxe, e foram achadas desenhando.
   *
   * A primeira tentativa manteve a altura de x em 0,73 da caixa alta e o
   * braço com uma corrida curta, o que fecha a contra-forma: a 32 px o y
   * virava uma mancha âmbar sólida, sem o vazio triangular que é justamente
   * o que distingue a letra. Um y precisa de largura — foi por isso que a
   * barra sozinha cabia num espaço que a letra não cabe.
   */
  xHeight: 0.6,
  /** Quanto o braço anda na horizontal enquanto desce da altura de x. */
  armRun: 0.36,
  /** Espaço entre o L e o y. Menor que o do arquivo antigo: lá havia uma
      barra solta, aqui há duas letras da mesma palavra. */
  gap: 60 / 431,
};

const TOTAL_WIDTH = G.lWidth + G.gap + G.armRun + 2 * G.stroke;
const TOTAL_HEIGHT = 1 + G.descender;

/**
 * As duas letras em coordenadas absolutas, dada a altura de caixa alta.
 *
 * O conjunto é centrado incluindo a descendente: ela é tinta como qualquer
 * outra, e ignorá-la deixaria o desenho visivelmente baixo no quadrado.
 */
function geometry(size, cap) {
  const x0 = (size - TOTAL_WIDTH * cap) / 2;
  const top = (size - TOTAL_HEIGHT * cap) / 2;
  const baseline = top + cap;

  const armLeft = x0 + (G.lWidth + G.gap) * cap;
  const stemLeft = armLeft + (G.armRun + G.stroke) * cap;
  const xTop = baseline - G.xHeight * cap;

  return {
    lStem: [x0, top, G.lStem * cap, cap],
    lFoot: [x0, baseline - G.lFoot * cap, G.lWidth * cap, G.lFoot * cap],
    yStem: [stemLeft, xTop, G.stroke * cap, G.xHeight * cap + G.descender * cap],
    /* Paralelogramo: espessura medida na horizontal, como num traço cortado a
       prumo — é o corte que o L também tem. */
    yArm: [
      [armLeft, xTop],
      [armLeft + G.stroke * cap, xTop],
      [stemLeft, baseline],
      [stemLeft - G.stroke * cap, baseline],
    ],
  };
}

function draw(CK, { size, cap, background, mono }) {
  const surface = CK.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);

  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  if (background) {
    paint.setColor(CK.parseColorString(background));
    canvas.drawRect(CK.XYWHRect(0, 0, size, size), paint);
  }

  if (cap) {
    const g = geometry(size, cap);

    paint.setColor(CK.parseColorString(WHITE));
    canvas.drawRect(CK.XYWHRect(...g.lStem), paint);
    canvas.drawRect(CK.XYWHRect(...g.lFoot), paint);

    paint.setColor(CK.parseColorString(mono ? WHITE : AMBER));
    canvas.drawRect(CK.XYWHRect(...g.yStem), paint);

    const arm = CK.Path.MakeFromSVGString(
      `M ${g.yArm.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`,
    );
    canvas.drawPath(arm, paint);
    arm.delete();
  }

  const bytes = surface.makeImageSnapshot().encodeToBytes();
  paint.delete();
  surface.delete();
  return Buffer.from(bytes);
}

/*
 * As alturas de caixa alta são as do arquivo que cada um substitui: o ícone
 * adaptativo do Android precisa caber na zona segura, e o splash é enquadrado
 * mais folgado que o ícone da loja. Mudar o desenho não é motivo para mudar o
 * enquadramento de cada destino.
 */
const TARGETS = [
  { file: 'icon.png', size: 1024, cap: 371, background: NAVY },
  { file: 'android-icon-foreground.png', size: 1024, cap: 300 },
  { file: 'android-icon-monochrome.png', size: 1024, cap: 300, mono: true },
  { file: 'android-icon-background.png', size: 1024, cap: 0, background: NAVY },
  { file: 'splash-icon.png', size: 512, cap: 274 },
  { file: 'favicon.png', size: 64, cap: 23, background: NAVY },
];

CanvasKitInit().then((CK) => {
  for (const target of TARGETS) {
    const out = path.join(OUT, target.file);
    fs.writeFileSync(out, draw(CK, target));
    console.log(
      `${target.file.padEnd(30)} ${target.size}×${target.size}` +
        (target.cap ? `  caixa alta ${target.cap}` : '  sem desenho'),
    );
  }
});
