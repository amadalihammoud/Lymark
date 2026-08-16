import { ImageFormat, Skia, type SkImage } from '@shopify/react-native-skia';

import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { sealExportedPhoto } from '@/features/attest/seal';

import { buildWatermarkContent } from './build-content';
import { writeExportedPhoto } from './photo-file';
import type { StampRenderer } from './skia-stamp';
import { buildStampGeometry } from './stamp-layout';

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

/**
 * Teto de resolução aceito para compor o carimbo.
 *
 * A composição precisa de DOIS bitmaps vivos ao mesmo tempo — a surface e o
 * instantâneo — a 4 bytes por pixel. Em 120 MP isso dá cerca de 960 MB, que
 * cabe com folga no limite de ~2 GB do heap do WebAssembly.
 *
 * O número foi escolhido por medição, não por estimativa. Acima dele o
 * comportamento é ruim de três maneiras diferentes, e nenhuma é um erro
 * limpo: por volta de 324 MP a surface é criada e o estouro só acontece no
 * instantâneo; acima de ~538 MP o Skia devolve um objeto "verdadeiro" com
 * referência nula, o que fazia a guarda existente passar direto; e um JPEG
 * de 10 MB que decodifica para 900 MP chega a travar a thread por quase um
 * minuto antes de falhar — no desktop, isso é a janela inteira congelada.
 *
 * 120 MP cobre com margem qualquer câmera de celular atual, inclusive os
 * sensores de 108 MP.
 */
const MAX_PIXELS = 120_000_000;

export class PhotoRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PhotoRenderError';
  }
}

/**
 * Libera um recurso do Skia sem deixar a limpeza derrubar o erro original.
 *
 * Quando o Skia recusa uma alocação, o objeto devolvido é "verdadeiro" mas
 * carrega referência nula por dentro. Chamar `dispose()` nele lança — e um
 * lançamento dentro do `finally` SUBSTITUI a exceção que estava subindo,
 * trocando uma mensagem em português por um `TypeError` do motor gráfico.
 * Era também o que impedia os recursos seguintes de serem liberados.
 */
function release(resource: { dispose: () => void } | null) {
  try {
    resource?.dispose();
  } catch {
    // Falha ao liberar não muda o resultado da exportação, e não pode
    // mascarar o motivo real de uma falha nem interromper a limpeza.
  }
}

export type StampedPhotoInput = {
  photoUri: string;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  renderer: StampRenderer;
};

/**
 * Compõe o carimbo sobre a foto e devolve os bytes do JPEG.
 *
 * Separado de `renderStampedPhoto` porque nem todo destino é o histórico do
 * app. O processamento em lote grava direto na pasta de saída escolhida, e
 * passar pelo caminho de gravação padrão abriria um diálogo por foto.
 */
export async function composeStampedPhoto({
  photoUri,
  metadata,
  preferences,
  renderer,
}: StampedPhotoInput): Promise<Uint8Array> {
  // A leitura fica dentro de um `try` proprio porque acontece ANTES do bloco
  // principal, e uma rejeicao aqui escapava crua: o usuario via "Failed to
  // fetch" num aplicativo inteiramente em portugues. Acontece quando a foto
  // sai do alcance entre a escolha e a exportacao — arquivo removido, ou
  // URL de blob revogada.
  let data;
  try {
    data = await Skia.Data.fromURI(photoUri);
  } catch (error) {
    throw new PhotoRenderError('Não foi possível ler a fotografia escolhida.', {
      cause: error,
    });
  }

  const image = Skia.Image.MakeImageFromEncoded(data);

  if (!image) {
    throw new PhotoRenderError('Não foi possível ler a fotografia escolhida.');
  }

  const width = image.width();
  const height = image.height();

  // A recusa acontece ANTES de alocar. A guarda seguinte, sozinha, era
  // inalcançável: quando o Skia recusa a alocação ele devolve um objeto
  // "verdadeiro" com referência nula por dentro, então `!surface` era falso e
  // a falha só aparecia mais adiante, como TypeError do motor gráfico.
  if (width * height > MAX_PIXELS) {
    const megapixels = Math.round((width * height) / 1_000_000);
    release(image);
    throw new PhotoRenderError(
      `A fotografia tem ${megapixels} MP e ultrapassa o limite de ` +
        `${MAX_PIXELS / 1_000_000} MP para o carimbo. Reduza a resolução da ` +
        'câmera ou escolha uma foto menor.',
    );
  }

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    // Rede de segurança: com o teto acima, chegar aqui significa que a
    // memória disponível é menor do que o esperado neste aparelho.
    release(image);
    throw new PhotoRenderError(
      'A fotografia é grande demais para ser processada neste aparelho.',
    );
  }

  // Declarado fora do `try` para que o `finally` alcance o instantâneo mesmo
  // quando a falha acontece antes de ele existir.
  let snapshot: SkImage | null = null;

  try {
    const canvas = surface.getCanvas();
    canvas.drawImage(image, 0, 0);

    const geometry = buildStampGeometry({
      content: buildWatermarkContent(metadata, preferences),
      preferences,
      frame: { width, height },
      measure: renderer.measure,
      // O carimbo acompanha a resolução do arquivo em vez de parar no tamanho
      // da tela. É a razão de tudo isto existir.
      allowGrowth: true,
    });

    renderer.draw(canvas, geometry);

    // O instantâneo é guardado numa variável porque precisa ser liberado: em
    // WebAssembly o coletor do JavaScript não alcança o heap do Skia, e um
    // instantâneo anônimo vazava o bitmap inteiro a cada exportação — 46 MB
    // por foto de 4000x3000. Num lote de fotos de celular moderno, a terceira
    // já estourava o limite de memória.
    snapshot = surface.makeImageSnapshot();
    const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
    if (!bytes) {
      throw new PhotoRenderError('Não foi possível codificar a imagem final.');
    }

    return bytes;
  } catch (error) {
    if (error instanceof PhotoRenderError) throw error;
    throw new PhotoRenderError('Não foi possível gerar a imagem com a marca d’água.', {
      cause: error,
    });
  } finally {
    release(snapshot);
    release(surface);
    release(image);
  }
}

/**
 * Compõe o carimbo e grava no armazenamento do app, devolvendo o caminho.
 *
 * É o caminho da captura avulsa: a foto entra no histórico assim que existe.
 */
export async function renderStampedPhoto(input: StampedPhotoInput): Promise<string> {
  // O selo de autenticidade entra ENTRE compor e gravar: com sessão e rede,
  // o recibo é embutido; sem qualquer um dos dois, os bytes seguem intactos
  // e a exportação não espera além do teto curto do selo.
  const { bytes } = await sealExportedPhoto(await composeStampedPhoto(input));
  return writeExportedPhoto(bytes);
}
