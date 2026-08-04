import {
  Skia,
  useFonts,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkTypeface,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

import { resolveLogoUri } from './logo-file';
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

const FAMILIES: Record<StampFont, string> = {
  clock: 'PathwayGothicOne',
  body: 'Barlow',
  medium: 'BarlowMedium',
};

const NORMAL_STYLE = { weight: 400, width: 5, slant: 0 } as const;

/** Carrega as fontes embutidas. `null` enquanto não terminam de carregar. */
export function useStampFontProvider(): SkTypefaceFontProvider | null {
  return useFonts({
    [FAMILIES.clock]: [
      require('@expo-google-fonts/pathway-gothic-one/400Regular/PathwayGothicOne_400Regular.ttf'),
    ],
    [FAMILIES.body]: [require('@expo-google-fonts/barlow/400Regular/Barlow_400Regular.ttf')],
    [FAMILIES.medium]: [require('@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf')],
  });
}

export type StampRenderer = {
  measure: MeasureText;
  draw: (canvas: SkCanvas, geometry: StampGeometry) => void;
};

/**
 * Decodifica o logotipo guardado, para o desenho poder ser síncrono.
 *
 * Devolve sempre um mapa — vazio enquanto carrega, ou quando não há logotipo.
 * Nunca `null`, porque o carimbo inteiro não deve esperar por um elemento
 * opcional dele.
 */
export async function loadStampImages(path: string | null): Promise<Map<string, SkImage>> {
  const images = new Map<string, SkImage>();
  if (!path) return images;

  try {
    const data = await Skia.Data.fromURI(resolveLogoUri(path));
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (image) images.set(path, image);
  } catch (error) {
    // O arquivo pode ter sumido numa restauração de backup. A foto sai sem o
    // logotipo, e não deixa de sair.
    console.warn('[marca] não foi possível ler o logotipo.', error);
  }

  return images;
}

/** A versão de tela: recarrega quando o logotipo escolhido muda. */
export function useStampImages(path: string | null): Map<string, SkImage> {
  const [images, setImages] = useState<Map<string, SkImage>>(EMPTY_IMAGES);

  useEffect(() => {
    let active = true;

    void loadStampImages(path).then((loaded) => {
      if (active) setImages(loaded);
      else for (const image of loaded.values()) image.dispose();
    });

    return () => {
      active = false;
    };
  }, [path]);

  return images;
}

/** Uma instância só: um `new Map()` a cada render refaria o `useMemo` do carimbo. */
const EMPTY_IMAGES = new Map<string, SkImage>();

/**
 * Monta o medidor e o desenhista a partir das fontes carregadas.
 *
 * Os objetos `SkFont` são caros de criar e a geometria pede a medida de cada
 * texto várias vezes — daí o cache por família e corpo.
 */
export function createStampRenderer(
  provider: SkTypefaceFontProvider,
  /**
   * Imagens já decodificadas, indexadas pelo caminho que a geometria devolve.
   *
   * Decodificar é assíncrono e o desenho não é: pedir os bytes aqui dentro
   * obrigaria o layout a esperar, a cada quadro do preview. Quem chama resolve
   * antes — a tela por um hook, a exportação por um `await`.
   */
  images?: Map<string, SkImage>,
): StampRenderer {
  const typefaces = new Map<StampFont, SkTypeface>();
  const fonts = new Map<string, SkFont>();

  const typefaceFor = (family: StampFont) => {
    let typeface = typefaces.get(family);
    if (!typeface) {
      typeface = provider.matchFamilyStyle(FAMILIES[family], NORMAL_STYLE);
      typefaces.set(family, typeface);
    }
    return typeface;
  };

  const fontFor = (family: StampFont, size: number) => {
    const key = `${family}@${size}`;
    let font = fonts.get(key);
    if (!font) {
      font = Skia.Font(typefaceFor(family), size);
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
      // A opacidade é do retângulo, e não da cor: assim o seletor guarda um
      // hexadecimal limpo e a transparência continua sendo um controle à
      // parte, que é como ela aparece na tela.
      paint.setAlphaf(rect.opacity ?? 1);

      const area = Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height);

      if (rect.radius) {
        canvas.drawRRect(Skia.RRectXY(area, rect.radius, rect.radius), paint);
      } else {
        canvas.drawRect(area, paint);
      }
    }

    paint.setAlphaf(1);

    for (const item of geometry.images) {
      const image = images?.get(item.path);
      // Sem os bytes carregados o logotipo simplesmente não é desenhado. É o
      // comportamento certo: um retângulo de espera carimbado numa foto
      // exportada seria pior do que a ausência dele.
      if (!image) continue;

      canvas.drawImageRect(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(item.x, item.y, item.width, item.height),
        paint,
      );
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
