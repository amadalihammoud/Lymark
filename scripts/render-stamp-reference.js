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
const { fitWithin, findInkBounds } = require(
  path.join(BUILD, 'src/features/watermark/logo-trim.js'),
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

/** Caminho de mentira, no formato que a validação aceita. */
const LOGO_PATH = 'brand/00000000-0000-4000-8000-000000000000.png';

/**
 * As variações que precisam ser vistas antes de qualquer build.
 *
 * Não é uma galeria: cada uma responde a uma pergunta que só a imagem responde.
 * A primeira é a regressão — o carimbo de sempre tem de continuar igual. As
 * outras três são o que este trabalho acrescentou.
 */
const VARIANTS = [
  {
    name: 'padrao',
    title: 'Padrão — regressão',
    preferences: {},
  },
  {
    name: 'cabecalho',
    title: 'Cabeçalho com logotipo',
    preferences: {
      brandPlacement: 'header',
      brandMode: 'custom',
      brandParts: [
        { text: 'AUTO', color: '#FFFFFF' },
        { text: 'GLASS', color: '#F5B60D' },
      ],
      brandComplement: 'Vidros e vistorias',
      brandComplementColor: '#9FB0C0',
      brandLogoPath: LOGO_PATH,
      brandLogoAspect: 1,
    },
  },
  {
    name: 'cabecalho-sem-logo',
    title: 'Cabeçalho sem logotipo',
    preferences: {
      brandPlacement: 'header',
      brandMode: 'custom',
      brandParts: [
        { text: 'Construtora', color: '#FFFFFF' },
        { text: ' Silva', color: '#5BD98A' },
      ],
      brandComplement: 'Laudos técnicos',
      brandComplementColor: '#FFFFFF',
      position: 'bottom-right',
      stampAccent: '#5BD98A',
    },
  },
  {
    name: 'faixa',
    title: 'Faixa de fundo a 55%',
    preferences: {
      brandPlacement: 'header',
      brandMode: 'custom',
      brandParts: [
        { text: 'TECNO', color: '#63B3ED' },
        { text: 'SUL', color: '#FFFFFF' },
      ],
      brandComplement: 'Perícias de engenharia',
      brandComplementColor: '#63B3ED',
      brandLogoPath: LOGO_PATH,
      brandLogoAspect: 1.6,
      backdropStyle: 'block',
      backdropColor: '#0B1119',
      backdropOpacity: 0.55,
      backdropRadius: 14,
      stampAccent: '#63B3ED',
    },
  },
  {
    name: 'faixa-continua',
    title: 'Faixa contínua a 70%',
    preferences: {
      brandPlacement: 'header',
      brandMode: 'custom',
      brandParts: [
        { text: 'TECNO', color: '#63B3ED' },
        { text: 'SUL', color: '#FFFFFF' },
      ],
      brandComplement: 'Perícias de engenharia',
      brandComplementColor: '#63B3ED',
      brandLogoPath: LOGO_PATH,
      brandLogoAspect: 1.6,
      backdropStyle: 'band',
      backdropColor: '#0B1119',
      backdropOpacity: 0.7,
      backdropRadius: 18,
      stampAccent: '#63B3ED',
    },
  },
];

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

  /** A geometria carrega a cor de cada traçado; o desenho precisa respeitá-la. */
  const toColor = (value, alpha = 1) => {
    const hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (hex) {
      const n = parseInt(hex[1], 16);
      return CK.Color((n >> 16) & 255, (n >> 8) & 255, n & 255, alpha);
    }
    const rgba = /rgba?\(([^)]+)\)/.exec(value);
    if (rgba) {
      const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim());
      return CK.Color(Number(r), Number(g), Number(b), Number(a) * alpha);
    }
    return CK.WHITE;
  };

  // Um logotipo por proporção declarada: desenhar sempre um quadrado e depois
  // esticá-lo faria a verificação exibir uma deformação que o aparelho não
  // produz — o arquivo real já vem na proporção que as preferências guardam.
  //
  // E cada um passa pelo **mesmo** recorte que a importação aplica no aparelho.
  // Sem isso a verificação mostraria a folga transparente do arquivo bruto e
  // atestaria um desalinhamento que o app não produz mais.
  const logos = new Map();
  const logoFor = (aspect) => {
    if (!logos.has(aspect)) logos.set(aspect, trimLogo(CK, makeLogo(CK, toColor, aspect)));
    return logos.get(aspect);
  };

  const results = VARIANTS.map((variant) => {
    const preferences = { ...DEFAULT_WATERMARK_PREFERENCES, ...variant.preferences };

    // A proporção sai do arquivo **já recortado**, como `persistLogo` faz na
    // importação. Declará-la antes do recorte deixaria a geometria contando com
    // uma forma que o arquivo não tem — e o logotipo sairia esticado aqui, num
    // defeito que o aparelho não produz.
    const logo = preferences.brandLogoPath
      ? logoFor(preferences.brandLogoAspect)
      : null;
    if (logo) preferences.brandLogoAspect = logo.width() / logo.height();

    const geometry = buildStampGeometry({
      content: CONTENT,
      preferences,
      frame: { width: WIDTH, height: HEIGHT },
      measure,
      allowGrowth: true,
    });

    const surface = CK.MakeSurface(WIDTH, HEIGHT);
    const canvas = surface.getCanvas();
    // Um degradê no lugar da fotografia: o carimbo é claro com sombra, e sobre
    // um fundo chapado não se avalia nem a sombra nem a faixa. É o mesmo teste
    // que o preview do aplicativo faz.
    drawScene(CK, canvas, WIDTH, HEIGHT);

    const paint = new CK.Paint();
    paint.setAntiAlias(true);

    for (const rect of geometry.rects) {
      paint.setColor(toColor(rect.color, rect.opacity === undefined ? 1 : rect.opacity));
      const area = CK.XYWHRect(rect.x, rect.y, rect.width, rect.height);
      if (rect.radius) {
        canvas.drawRRect(CK.RRectXY(area, rect.radius, rect.radius), paint);
      } else {
        canvas.drawRect(area, paint);
      }
    }

    paint.setColor(CK.WHITE);
    for (const item of geometry.images) {
      canvas.drawImageRect(
        logo,
        CK.XYWHRect(0, 0, logo.width(), logo.height()),
        CK.XYWHRect(item.x, item.y, item.width, item.height),
        paint,
      );
    }

    // A sombra vem da geometria, e não do estilo de tela: sem a faixa escura o
    // texto branco depende dela para sobreviver a céu, areia ou parede clara.
    const shadow = new CK.Paint();
    shadow.setAntiAlias(true);
    shadow.setColor(toColor(geometry.shadow.color));
    shadow.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, geometry.shadow.blur / 2, false));

    for (const t of geometry.texts) {
      paint.setColor(toColor(t.color));
      canvas.save();
      if (t.rotate) {
        canvas.translate(t.x, t.baseline);
        canvas.rotate(t.rotate, 0, 0);
        drawRun(CK, canvas, t, 0, 0, fontFor(t.font, t.size), paint, shadow, geometry);
      } else {
        drawRun(CK, canvas, t, t.x, t.baseline, fontFor(t.font, t.size), paint, shadow, geometry);
      }
      canvas.restore();
    }

    surface.flush();

    const out = path.join(
      process.env.LYMARK_CALIB_OUT || '/tmp',
      `stamp-${variant.name}.png`,
    );
    fs.writeFileSync(out, Buffer.from(surface.makeImageSnapshot().encodeToBytes()));

    return { variant, geometry, out };
  });

  report(CK, results, measure, fontFor);
});

/**
 * Desenha um texto, glifo a glifo quando há espaçamento — como o aparelho.
 *
 * `drawText` não conhece `letterSpacing`. Desenhar aqui de um jeito e no
 * aparelho de outro faria esta verificação atestar uma imagem que não é a que
 * sai do telefone, que é o oposto do propósito dela.
 */
function drawRun(CK, canvas, item, x, baseline, font, paint, shadow, geometry) {
  const shadowY = baseline + geometry.shadow.offsetY;

  if (!item.letterSpacing) {
    canvas.drawText(item.text, x, shadowY, shadow, font);
    canvas.drawText(item.text, x, baseline, paint, font);
    return;
  }

  const widths = font.getGlyphWidths(font.getGlyphIDs(item.text));
  let cursor = x;

  for (const [index, char] of [...item.text].entries()) {
    canvas.drawText(char, cursor, shadowY, shadow, font);
    canvas.drawText(char, cursor, baseline, paint, font);
    cursor += (widths[index] ?? 0) + item.letterSpacing;
  }
}

/** Um logotipo sintético, para não depender de arquivo externo. */
function makeLogo(CK, toColor, aspect = 1) {
  const H = 512;
  const W = Math.round(H * aspect);

  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);

  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  // Um alvo redondo mais barras: o círculo denuncia deformação de proporção na
  // hora, e as barras fazem a marca de fato ocupar a largura declarada — uma
  // assinatura horizontal, e não um círculo sobrando num quadro largo. Tudo
  // com folga transparente em volta, como todo arquivo de logotipo real.
  paint.setColor(toColor('#F5B60D'));
  canvas.drawCircle(W / 2, H / 2, H * 0.46, paint);

  paint.setColor(toColor('#0B1119'));
  canvas.drawCircle(W / 2, H / 2, H * 0.3, paint);

  paint.setColor(toColor('#F5B60D'));
  canvas.drawRect(CK.XYWHRect(W / 2 - H * 0.04, H * 0.12, H * 0.08, H * 0.76), paint);

  if (W > H) {
    for (const side of [-1, 1]) {
      const x = W / 2 + side * H * 0.5;
      canvas.drawRect(
        CK.XYWHRect(side < 0 ? H * 0.04 : x, H * 0.44, (W - H) / 2 - H * 0.04, H * 0.12),
        paint,
      );
    }
  }

  surface.flush();
  return surface.makeImageSnapshot();
}

/**
 * Apara a margem transparente, como `persistLogo` faz na importação.
 *
 * É a mesma `findInkBounds` que roda no aparelho, alimentada com pixels reais
 * em vez de um bitmap de teste — o que faz desta verificação uma prova da
 * função, e não só do desenho.
 */
function trimLogo(CK, image) {
  const width = image.width();
  const height = image.height();

  const surface = CK.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  canvas.drawImage(image, 0, 0, new CK.Paint());
  surface.flush();

  const pixels = canvas.readPixels(0, 0, {
    width,
    height,
    colorType: CK.ColorType.RGBA_8888,
    alphaType: CK.AlphaType.Unpremul,
    colorSpace: CK.ColorSpace.SRGB,
  });

  const bounds = findInkBounds(pixels, width, height) ?? { x: 0, y: 0, width, height };
  const target = fitWithin(bounds, 1024);

  console.log(
    `recorte do logotipo      : ${width}x${height} → ${target.width}x${target.height}` +
      ` (folga: ${bounds.x} esq., ${bounds.y} topo)`,
  );

  const out = CK.MakeSurface(target.width, target.height);
  const c = out.getCanvas();
  c.clear(CK.TRANSPARENT);
  c.drawImageRect(
    image,
    CK.XYWHRect(bounds.x, bounds.y, bounds.width, bounds.height),
    CK.XYWHRect(0, 0, target.width, target.height),
    new CK.Paint(),
  );
  out.flush();

  return out.makeImageSnapshot();
}

/** Um degradê claro→escuro no lugar da fotografia. */
function drawScene(CK, canvas, width, height) {
  const paint = new CK.Paint();
  paint.setShader(
    CK.Shader.MakeLinearGradient(
      [0, 0],
      [width, height],
      [
        CK.Color(242, 245, 248, 1),
        CK.Color(159, 176, 192, 1),
        CK.Color(49, 65, 79, 1),
        CK.Color(11, 17, 25, 1),
      ],
      [0, 0.38, 0.72, 1],
      CK.TileMode.Clamp,
    ),
  );
  canvas.drawRect(CK.XYWHRect(0, 0, width, height), paint);
}

/**
 * A aferição numérica que acompanha as imagens.
 *
 * As duas invariantes que importam: a hora tem de sair na largura medida na
 * referência, e cada âncora de tinta tem de casar com o elemento que a segue —
 * a barra âmbar com os algarismos, o logotipo com o nome e o complemento.
 */
function report(CK, results, measure, fontFor) {
  const base = results[0];
  const time = base.geometry.texts.find((t) => t.text === CONTENT.time);
  const rule = base.geometry.rects.find((r) => r.color === '#F5B60D');

  /**
   * A referência foi medida em **tinta**, não em avanço: o alvo de 219 px é a
   * largura do traçado visível. Avanço inclui as folgas laterais dos glifos e
   * daria 5,9% a mais nesta fonte — comparar os dois seria erro de aferição.
   */
  const inkWidth = measureInk(CK, time.text, fontFor('clock', time.size));

  console.log('=== carimbo desenhado em', WIDTH, 'x', HEIGHT, '===');
  console.log('corpo da hora            :', time.size);
  console.log('tinta de "21:55"         :', inkWidth, '| alvo da referência: 219');
  console.log('desvio                   :', (((inkWidth - 219) / 219) * 100).toFixed(1), '%');
  console.log('barra: topo', rule.y.toFixed(1), 'altura', rule.height.toFixed(1));
  console.log('tinta: topo', (time.baseline - time.size * 0.715).toFixed(1),
    'altura', (time.size * 0.73).toFixed(1));

  const withLogo = results.find((r) => r.geometry.images.length > 0);
  if (withLogo) {
    const { geometry } = withLogo;
    const logo = geometry.images[0];
    const parts = geometry.texts.filter((t) => t.font === 'medium' && !t.rotate);
    const nome = parts[0];
    const complemento = parts[parts.length - 1];

    // O que a imagem mostra, medido: o logotipo começa no topo da tinta do
    // nome e termina na **linha de base** do complemento — onde o texto se
    // apoia, e não onde as descendentes chegam.
    const nomeInkTop = nome.baseline - nome.size * 0.71;

    console.log('\n=== cabeçalho da marca ===');
    console.log('nome     : corpo', nome.size, '| topo da tinta', nomeInkTop.toFixed(1));
    console.log('logotipo : topo', logo.y.toFixed(1), '| base',
      (logo.y + logo.height).toFixed(1));
    console.log('complem. : corpo', complemento.size, '| linha de base',
      complemento.baseline.toFixed(1));
    console.log('erro topo:', Math.abs(logo.y - nomeInkTop).toFixed(2), 'px');
    console.log('erro base:', Math.abs(logo.y + logo.height - complemento.baseline).toFixed(2), 'px');
  }

  console.log('\n=== arquivos ===');
  for (const { variant, geometry, out } of results) {
    console.log(
      `${variant.title.padEnd(26)} ${geometry.texts.length} textos, ` +
        `${geometry.rects.length} retângulos, ${geometry.images.length} imagens → ${out}`,
    );
  }
}

/** Largura do traçado visível de um texto, lida nos pixels. */
function measureInk(CK, text, font) {
  const size = font.getSize();
  const pad = Math.ceil(size);
  const w = Math.ceil(size * 3) + pad * 2;
  const h = Math.ceil(size * 3);

  const surface = CK.MakeSurface(w, h);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);

  const paint = new CK.Paint();
  paint.setColor(CK.WHITE);
  paint.setAntiAlias(true);
  canvas.drawText(text, pad, Math.round(h / 2), paint, font);
  surface.flush();

  const px = canvas.readPixels(0, 0, {
    width: w,
    height: h,
    colorType: CK.ColorType.RGBA_8888,
    alphaType: CK.AlphaType.Unpremul,
    colorSpace: CK.ColorSpace.SRGB,
  });

  let left = Infinity;
  let right = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  paint.delete();
  surface.delete();
  return right - left + 1;
}
