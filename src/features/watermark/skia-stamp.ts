import {
  Skia,
  useTypeface,
  type SkCanvas,
  type SkFont,
  type SkTypeface,
} from '@shopify/react-native-skia';

import type { MeasureText, StampFont, StampGeometry } from './stamp-layout';

/**
 * A ponte entre a geometria e o Skia.
 *
 * A geometria não conhece motor gráfico: devolve posições absolutas e pede uma
 * função de medição. Este módulo fornece as duas pontas — as fontes reais para
 * medir, e o desenho — de modo que o **mesmo** resultado sirva ao preview na
 * tela e ao arquivo exportado em resolução cheia. É o que faz o que se vê ser
 * literalmente o que se exporta.
 */

/** As três fontes do carimbo, prontas para desenhar. */
export type StampTypefaces = Record<StampFont, SkTypeface>;

/**
 * Carrega as fontes embutidas. `null` enquanto não terminam de carregar.
 *
 * Usa `useTypeface`, que devolve o typeface direto, em vez do `useFonts`, que
 * devolve um `SkTypefaceFontProvider`. A diferença não é de estilo: o
 * `matchFamilyStyle` do provider **não é implementado no react-native-web** —
 * lança "Not implemented on React Native Web". Como é por ele que se obtinha
 * cada typeface, o carimbo não podia ser desenhado na web, nem no preview nem
 * na exportação. As fontes carregavam; consultá-las é que falhava.
 *
 * O `useTypeface` passa pelo `loadData`, que aceita tanto o número do asset
 * (nativo) quanto a URL em string (web) — o mesmo código serve às duas
 * plataformas, que é o requisito para o desenho não divergir.
 */
export function useStampTypefaces(): StampTypefaces | null {
  const clock = useTypeface(
    require('@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf'),
  );
  const body = useTypeface(require('@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf'));
  const medium = useTypeface(require('@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf'));

  // Tudo ou nada: desenhar com uma fonte faltando sairia com a substituta do
  // Skia, e o carimbo mudaria de desenho sem ninguém perceber.
  if (!clock || !body || !medium) return null;
  return { clock, body, medium };
}

export type StampRenderer = {
  measure: MeasureText;
  draw: (canvas: SkCanvas, geometry: StampGeometry) => void;
};

/**
 * Monta o medidor e o desenhista a partir das fontes carregadas.
 *
 * Os objetos `SkFont` são caros de criar e a geometria pede a medida de cada
 * texto várias vezes — daí o cache por família e corpo.
 */
export function createStampRenderer(typefaces: StampTypefaces): StampRenderer {
  const fonts = new Map<string, SkFont>();

  const fontFor = (family: StampFont, size: number) => {
    const key = `${family}@${size}`;
    let font = fonts.get(key);
    if (!font) {
      font = Skia.Font(typefaces[family], size);
      fonts.set(key, font);
    }
    return font;
  };

  // Avanço, e não caixa de tinta: é o avanço que determina onde o próximo
  // elemento começa. A mesma grandeza que os scripts de calibragem medem.
  const measure: MeasureText = (text, size, family) => {
    const font = fontFor(family, size);
    return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((total, w) => total + w, 0);
  };

  const draw = (canvas: SkCanvas, geometry: StampGeometry) => {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    for (const rect of geometry.rects) {
      paint.setColor(Skia.Color(rect.color));
      const area = Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height);
      if (rect.radius) {
        canvas.drawRRect(Skia.RRectXY(area, rect.radius, rect.radius), paint);
      } else {
        canvas.drawRect(area, paint);
      }
    }

    // Sem a faixa de fundo — que vem desligada por padrão — é esta sombra que
    // mantém o texto branco legível sobre céu, areia ou parede clara.
    const shadow = Skia.Paint();
    shadow.setAntiAlias(true);
    shadow.setColor(Skia.Color(geometry.shadow.color));
    shadow.setMaskFilter(
      Skia.MaskFilter.MakeBlur(0 /* Normal */, geometry.shadow.blur / 2, false),
    );

    for (const item of geometry.texts) {
      const font = fontFor(item.font, item.size);
      paint.setColor(Skia.Color(item.color));

      canvas.save();
      if (item.rotate) {
        canvas.translate(item.x, item.baseline);
        canvas.rotate(item.rotate, 0, 0);
        drawRun(canvas, item.text, 0, 0, font, paint, shadow, item.letterSpacing, geometry);
      } else {
        drawRun(
          canvas, item.text, item.x, item.baseline, font, paint, shadow,
          item.letterSpacing, geometry,
        );
      }
      canvas.restore();
    }
  };

  return { measure, draw };
}

/**
 * Desenha um texto, glifo a glifo quando há espaçamento.
 *
 * `drawText` não conhece `letterSpacing`; posicionar cada glifo é o que
 * mantém o código de foto e a marca com o mesmo espaçamento do layout antigo —
 * e o que faz a largura desenhada bater com a largura que a geometria contou.
 */
function drawRun(
  canvas: SkCanvas,
  text: string,
  x: number,
  baseline: number,
  font: SkFont,
  paint: ReturnType<typeof Skia.Paint>,
  shadow: ReturnType<typeof Skia.Paint>,
  letterSpacing: number | undefined,
  geometry: StampGeometry,
) {
  const shadowY = baseline + geometry.shadow.offsetY;

  if (!letterSpacing) {
    canvas.drawText(text, x, shadowY, shadow, font);
    canvas.drawText(text, x, baseline, paint, font);
    return;
  }

  const widths = font.getGlyphWidths(font.getGlyphIDs(text));
  let cursor = x;

  for (const [index, char] of [...text].entries()) {
    canvas.drawText(char, cursor, shadowY, shadow, font);
    canvas.drawText(char, cursor, baseline, paint, font);
    cursor += (widths[index] ?? 0) + letterSpacing;
  }
}
