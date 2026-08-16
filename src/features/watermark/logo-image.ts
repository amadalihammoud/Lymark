import { AlphaType, ColorType, ImageFormat, Skia } from '@shopify/react-native-skia';

import { fitWithin, findInkBounds } from './logo-trim';

/**
 * O preparo do logotipo — decodificar, aparar a margem transparente, limitar o
 * tamanho e regravar como PNG.
 *
 * Vive separado de `logo-file.ts` porque esta parte é a mesma em toda
 * plataforma: só o Skia entra aqui, e o Skia é o mesmo no aparelho, na web e
 * no desktop. O que muda de um lado para o outro é **onde** o resultado é
 * guardado, e isso fica em `logo-file.ts` / `logo-file.web.ts`.
 *
 * A margem transparente é aparada na importação. O carimbo ancora o logotipo
 * entre o topo da caixa alta do nome e a linha de base do complemento, e esse
 * alinhamento é exato — do retângulo. Quem decide onde a tinta cai dentro dele
 * é o arquivo, e quase todo PNG de logotipo traz folga em volta: medido num
 * caso real, 4 px acima e 5 abaixo num conjunto de 88 px. O alinhamento
 * existia e não se enxergava. Recortando na entrada, ele passa a valer para
 * qualquer arquivo, e não só para quem recortou rente.
 */

/** Lado maior do arquivo guardado. Ver `fitWithin`. */
export const LOGO_MAX_EDGE = 1024;

export class LogoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LogoError';
  }
}

/**
 * Sempre PNG na saída, seja qual for a entrada: é o formato que preserva a
 * transparência, e recodificar um JPG como PNG não inventa transparência
 * nenhuma — o fundo branco continua branco, que é exatamente o que a tela
 * avisa.
 *
 * @returns os bytes do PNG e a proporção **já recortada**, que é a que a
 *   geometria precisa conhecer.
 */
export async function prepareLogo(
  sourceUri: string,
): Promise<{ bytes: Uint8Array; aspect: number }> {
  const source = await decode(sourceUri);

  try {
    const bounds = inkBoundsOf(source) ?? {
      x: 0,
      y: 0,
      width: source.width(),
      height: source.height(),
    };

    const target = fitWithin(bounds, LOGO_MAX_EDGE);

    const surface = Skia.Surface.MakeOffscreen(target.width, target.height);
    if (!surface) {
      throw new LogoError('Não foi possível preparar esta imagem neste aparelho.');
    }

    try {
      surface
        .getCanvas()
        .drawImageRect(
          source,
          Skia.XYWHRect(bounds.x, bounds.y, bounds.width, bounds.height),
          Skia.XYWHRect(0, 0, target.width, target.height),
          Skia.Paint(),
        );

      const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100);
      if (!bytes) throw new LogoError('Não foi possível gravar o logotipo.');

      return { bytes, aspect: target.width / target.height };
    } finally {
      surface.dispose();
    }
  } finally {
    source.dispose();
  }
}

async function decode(uri: string) {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new LogoError('Não foi possível ler esta imagem. Tente um PNG ou JPG.');
  }

  return image;
}

/**
 * A caixa da tinta, lida no bitmap decodificado.
 *
 * `null` quando não há o que aparar — imagem opaca de ponta a ponta, ou uma
 * leitura de pixels que o aparelho recusou. Nos dois casos o arquivo é
 * guardado inteiro, que é melhor do que recusar o logotipo da pessoa.
 */
function inkBoundsOf(image: ReturnType<typeof Skia.Image.MakeImageFromEncoded>) {
  if (!image) return null;

  const width = image.width();
  const height = image.height();

  try {
    // Unpremul, e não Premul: com a cor já multiplicada pelo alfa, um pixel
    // preto translúcido e um transparente ficam idênticos nos três canais, e o
    // canal de alfa é justamente o que esta varredura lê.
    const pixels = image.readPixels(0, 0, {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });

    if (!pixels || pixels instanceof Float32Array) return null;

    return findInkBounds(pixels, width, height);
  } catch (error) {
    console.warn('[marca] não foi possível medir a transparência do logotipo.', error);
    return null;
  }
}
