import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * A porta JavaScript do módulo nativo de carimbo de vídeo.
 *
 * `requireOptionalNativeModule` devolve `null` onde o módulo não existe —
 * web, desktop e o Expo Go. A tela
 * consulta `isVideoStampAvailable` e explica a ausência em vez de quebrar:
 * a mesma degradação dita de sempre.
 */

type NativeVideoStamp = {
  stamp(inputUri: string, overlayPath: string, outputPath: string): Promise<string>;
};

const native = requireOptionalNativeModule<NativeVideoStamp>('VideoStamp');

export const isVideoStampAvailable = native != null;

/**
 * Compõe o carimbo (PNG já gravado em `overlayPath`) sobre o vídeo.
 *
 * `outputPath` é um caminho de arquivo simples, sem esquema `file://` — é o
 * que o Transformer espera para a saída. Devolve o mesmo caminho ao concluir.
 */
export async function stampVideo(
  inputUri: string,
  overlayPath: string,
  outputPath: string,
): Promise<string> {
  if (!native) throw new Error('O carimbo de vídeo não está disponível nesta plataforma.');
  return native.stamp(inputUri, overlayPath, outputPath);
}
