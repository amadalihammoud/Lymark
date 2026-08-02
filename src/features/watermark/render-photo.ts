import { ImageFormat, Skia } from '@shopify/react-native-skia';

import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import { writeExportedPhoto } from './photo-file';
import type { StampRenderer } from './skia-stamp';
import { buildStampGeometry, type StampColors } from './stamp-layout';

/**
 * Compõe o carimbo sobre a fotografia original, na resolução dela.
 *
 * O caminho antigo fotografava a interface: o arquivo saía com a resolução da
 * tela — cerca de 1100 px — enquanto a foto do aparelho tem 4000. O técnico
 * entregava ao cliente uma imagem visivelmente pior que a que tirou.
 *
 * Aqui a foto é decodificada, o carimbo é desenhado por cima em escala
 * proporcional, e o resultado é codificado de novo. A tela deixa de participar
 * da exportação — o que também elimina a captura em branco quando a imagem
 * ainda não terminou de decodificar.
 */

/** Qualidade do JPEG. Alto o bastante para não marcar o texto do carimbo. */
const JPEG_QUALITY = 92;

export class PhotoRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PhotoRenderError';
  }
}

export async function renderStampedPhoto({
  photoUri,
  metadata,
  preferences,
  colors,
  renderer,
}: {
  photoUri: string;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  colors: StampColors;
  renderer: StampRenderer;
}): Promise<string> {
  const data = await Skia.Data.fromURI(photoUri);
  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new PhotoRenderError('Não foi possível ler a fotografia escolhida.');
  }

  const width = image.width();
  const height = image.height();

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    // Acontece quando a imagem é grande demais para a memória disponível.
    throw new PhotoRenderError(
      'A fotografia é grande demais para ser processada neste aparelho.',
    );
  }

  try {
    const canvas = surface.getCanvas();
    canvas.drawImage(image, 0, 0);

    const geometry = buildStampGeometry({
      content: buildWatermarkContent(metadata, preferences),
      preferences,
      frame: { width, height },
      colors,
      measure: renderer.measure,
      // O carimbo acompanha a resolução do arquivo em vez de parar no tamanho
      // da tela. É a razão de tudo isto existir.
      allowGrowth: true,
    });

    renderer.draw(canvas, geometry);

    const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
    if (!bytes) {
      throw new PhotoRenderError('Não foi possível codificar a imagem final.');
    }

    return writeExportedPhoto(bytes);
  } catch (error) {
    if (error instanceof PhotoRenderError) throw error;
    throw new PhotoRenderError('Não foi possível gerar a imagem com a marca d’água.', {
      cause: error,
    });
  } finally {
    surface.dispose();
    image.dispose();
  }
}
