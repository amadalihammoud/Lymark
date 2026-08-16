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

const NAVY = '#15243C';
const WHITE = '#FFFFFF';
const AMBER = '#F3C218';

/** Tudo em unidades de altura de caixa alta, medido no ícone anterior. */
const G = {
  lStem: 103 / 431,
  lFoot: 101 / 431,
  lWidth: 267 / 431,
  stroke: 74 / 431,
  gap: 87 / 431,

  /*
   * As duas medidas que o "y" trouxe.
   *
   * Uma tentativa anterior desceu o traço âmbar para a altura de x e o
   * prolongou numa descendente abaixo da linha de base. Era o y
   * tipograficamente correto, e mudava demais: o topo e a base do conjunto
   * saíam do lugar, e o ícone deixava de ser o mesmo desenho.
   *
   * Aqui o traço âmbar não se move — mesmo x, mesmo topo, mesma base, mesma
   * espessura. O braço é acrescentado no vazio que já existia entre o L e
   * ele, e a caixa do conjunto continua sendo exatamente a de antes. O que
   * muda é só o que o traço significa.
   */
  junction: 0.58,
  /** Quanto o braço anda na horizontal enquanto desce até encontrar a haste. */
  armRun: 96 / 431,

  /*
   * Quanto o braço para antes da haste. A barra horizontal que faz a junção
   * mede `armBack + stroke`, então este número é o que controla o
   * comprimento dela.
   *
   * É a medida mais delicada do desenho. Braço, barra e haste fecham um
   * triângulo — que é exatamente como o algarismo **4** é construído. Com a
   * barra em 148 px o âmbar é lido como 4 antes de ser lido como letra, e o
   * ícone volta a dizer uma coisa que não é o nome, como dizia LI. Encurtar
   * reabre a contra-forma e devolve a letra.
   *
   * Em zero a barra fica na espessura do próprio traço: o braço volta a
   * encostar na haste e o que sobra é uma sombra horizontal sob a junção —
   * presente, sem fechar figura nenhuma.
   */
  armBack: 0,
};

const TOTAL_WIDTH = G.lWidth + G.gap + G.stroke;
const TOTAL_HEIGHT = 1;

/**
 * As duas letras em coordenadas absolutas, dada a altura de caixa alta.
 *
 * O braço cabe inteiro no vazio entre o L e a haste, então a caixa do
 * conjunto — topo, base e as duas laterais — é a mesma de antes do "y"
 * existir.
 */
function geometry(size, cap) {
  const x0 = (size - TOTAL_WIDTH * cap) / 2;
  const top = (size - TOTAL_HEIGHT * cap) / 2;
  const baseline = top + cap;

  const stemLeft = x0 + (G.lWidth + G.gap) * cap;
  const junction = top + G.junction * cap;
  const back = G.armBack * cap;
  const armRight = stemLeft - back;
  const armLeft = armRight - (G.stroke + G.armRun) * cap;

  return {
    lStem: [x0, top, G.lStem * cap, cap],
    lFoot: [x0, baseline - G.lFoot * cap, G.lWidth * cap, G.lFoot * cap],
    yStem: [stemLeft, top, G.stroke * cap, cap],
    /* Paralelogramo: espessura medida na horizontal, como num traço cortado a
       prumo — é o corte que o L também tem. */
    yArm: [
      [armLeft, top],
      [armLeft + G.stroke * cap, top],
      [armRight, junction],
      [armRight - G.stroke * cap, junction],
    ],
    /* A barra de junção, apoiada na junção e encostando na haste. */
    yLink: [armRight - G.stroke * cap, junction - G.stroke * cap, back + G.stroke * cap, G.stroke * cap],
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
    canvas.drawRect(CK.XYWHRect(...g.yLink), paint);

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
  { file: 'icon.png', size: 1024, cap: 431, background: NAVY },
  { file: 'android-icon-foreground.png', size: 1024, cap: 349 },
  { file: 'android-icon-monochrome.png', size: 1024, cap: 349, mono: true },
  { file: 'android-icon-background.png', size: 1024, cap: 0, background: NAVY },
  { file: 'splash-icon.png', size: 512, cap: 317 },
  { file: 'favicon.png', size: 64, cap: 27, background: NAVY },
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
