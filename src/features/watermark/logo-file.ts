import { AlphaType, ColorType, ImageFormat, Skia } from '@shopify/react-native-skia';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { LOGO_DIRECTORY_NAME, isManagedLogoPath } from './logo-path';
import { fitWithin, findInkBounds } from './logo-trim';

/**
 * Onde o logotipo da empresa mora, e em que forma.
 *
 * Duas decisões sustentam este módulo.
 *
 * A primeira: o arquivo é copiado para dentro do app. O seletor devolve uma URI
 * de conteúdo — no Android um `content://` com permissão temporária, no iOS um
 * arquivo em cache. As duas expiram. Um logotipo escolhido em janeiro precisa
 * continuar sendo carimbado em julho. Guarda-se **caminho relativo**, nunca a
 * URI absoluta, porque no iOS o identificador do contêiner muda a cada
 * atualização do app.
 *
 * A segunda: a margem transparente é aparada na importação. O carimbo ancora o
 * logotipo entre o topo da caixa alta do nome e a linha de base do complemento,
 * e esse alinhamento é exato — do retângulo. Quem decide onde a tinta cai
 * dentro dele é o arquivo, e quase todo PNG de logotipo traz folga em volta:
 * medido num caso real, 4 px acima e 5 abaixo num conjunto de 88 px. O
 * alinhamento existia e não se enxergava. Recortando na entrada, ele passa a
 * valer para qualquer arquivo, e não só para quem recortou rente.
 */

/** Lado maior do arquivo guardado. Ver `fitWithin`. */
const MAX_EDGE = 1024;

export class LogoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LogoError';
  }
}

function logoDirectory(): Directory {
  const directory = new Directory(Paths.document, LOGO_DIRECTORY_NAME);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/** Caminho relativo → URI utilizável para exibir e para decodificar no Skia. */
export function resolveLogoUri(path: string): string {
  return new File(Paths.document, path).uri;
}

/**
 * Prepara o arquivo escolhido e o guarda dentro do app.
 *
 * Sempre PNG na saída, seja qual for a entrada: é o formato que preserva a
 * transparência, e recodificar um JPG como PNG não inventa transparência
 * nenhuma — o fundo branco continua branco, que é exatamente o que a tela
 * avisa.
 *
 * @returns o caminho relativo e a proporção **já recortada**, que é a que a
 *   geometria precisa conhecer.
 */
export async function persistLogo(
  sourceUri: string,
): Promise<{ path: string; aspect: number }> {
  const source = await decode(sourceUri);

  try {
    const bounds = inkBoundsOf(source) ?? {
      x: 0,
      y: 0,
      width: source.width(),
      height: source.height(),
    };

    const target = fitWithin(bounds, MAX_EDGE);

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

      const fileName = `${Crypto.randomUUID()}.png`;
      const file = new File(logoDirectory(), fileName);
      file.create({ overwrite: true });
      file.write(bytes);

      return {
        path: `${LOGO_DIRECTORY_NAME}/${fileName}`,
        aspect: target.width / target.height,
      };
    } finally {
      surface.dispose();
    }
  } finally {
    source.dispose();
  }
}

/** Apaga o logotipo anterior quando outro toma o lugar dele. */
export function deleteLogo(path: string): void {
  if (!isManagedLogoPath(path)) return;

  try {
    const file = new File(Paths.document, path);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[marca] não foi possível apagar o logotipo anterior.', error);
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
