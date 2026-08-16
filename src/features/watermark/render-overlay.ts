import { ImageFormat, Skia, type SkImage } from '@shopify/react-native-skia';

import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import { PhotoRenderError } from './render-photo';
import type { StampRenderer } from './skia-stamp';
import { buildStampGeometry } from './stamp-layout';

/**
 * O carimbo sozinho, num quadro transparente — a peça do vídeo.
 *
 * O vídeo não passa pelo Skia: quem compõe é o ffmpeg, no processo principal
 * do Electron, quadro a quadro. O que passa pelo Skia é O CARIMBO, desenhado
 * aqui exatamente como na foto — mesma geometria, mesmas fontes, mesma
 * escala em relação ao quadro — sobre um PNG transparente do tamanho do
 * vídeo. O ffmpeg só sobrepõe em (0,0): toda a decisão de posição já veio
 * resolvida do mesmo código que decide na foto, e é isso que garante que o
 * carimbo do vídeo e o da foto sejam literalmente o mesmo desenho.
 *
 * O carimbo é estático de propósito: o registro é do momento da captura, e
 * um relógio correndo custaria uma renderização por quadro sem acrescentar
 * nada ao valor de comprovação.
 */
export async function composeStampOverlay({
  width,
  height,
  metadata,
  preferences,
  renderer,
}: {
  /** Dimensões do quadro do vídeo, vindas da sondagem do ffmpeg. */
  width: number;
  height: number;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  renderer: StampRenderer;
}): Promise<Uint8Array> {
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    throw new PhotoRenderError('Não foi possível preparar o carimbo do vídeo.');
  }

  let snapshot: SkImage | null = null;

  try {
    const canvas = surface.getCanvas();
    // O fundo é o vídeo, que não está aqui: tudo que não é carimbo fica
    // transparente para o ffmpeg deixar o quadro passar.
    canvas.clear(Skia.Color('#00000000'));

    const geometry = buildStampGeometry({
      content: buildWatermarkContent(metadata, preferences),
      preferences,
      frame: { width, height },
      measure: renderer.measure,
      // Como na foto: o carimbo acompanha a resolução do arquivo.
      allowGrowth: true,
    });

    renderer.draw(canvas, geometry);

    snapshot = surface.makeImageSnapshot();
    const bytes = snapshot.encodeToBytes(ImageFormat.PNG, 100);
    if (!bytes) {
      throw new PhotoRenderError('Não foi possível codificar o carimbo do vídeo.');
    }
    return bytes;
  } catch (error) {
    if (error instanceof PhotoRenderError) throw error;
    throw new PhotoRenderError('Não foi possível gerar o carimbo do vídeo.', { cause: error });
  } finally {
    // A mesma disciplina de `render-photo.ts`: em WebAssembly o coletor não
    // alcança o heap do Skia, e a limpeza não pode mascarar o erro original.
    try {
      snapshot?.dispose();
    } catch {
      /* ver acima */
    }
    try {
      surface.dispose();
    } catch {
      /* ver acima */
    }
  }
}
