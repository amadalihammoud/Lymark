/**
 * Carimbo de vídeo no navegador — reprodução para um canvas, com o carimbo
 * por cima, gravada em tempo real.
 *
 * A web não tem ffmpeg. O que ela tem, em qualquer navegador atual, é:
 * reproduzir vídeo num elemento, desenhar cada quadro num canvas junto com
 * o carimbo (o MESMO PNG transparente do desktop, desenhado pelo mesmo
 * código da foto), capturar o canvas como stream e gravá-lo com
 * MediaRecorder. O custo do desenho é o tempo: a gravação acontece em tempo
 * real — um vídeo de dois minutos leva dois minutos — e a saída é WebM,
 * porque é o que o MediaRecorder garante. Os dois limites estão ditos na
 * tela, com o desktop apontado como o caminho para vídeo longo.
 *
 * WebCodecs faria melhor (mais rápido, MP4), mas exige desmontar e remontar
 * o contêiner — uma dependência inteira — e cobertura irregular entre
 * navegadores. O tempo real é o degrau honesto de hoje.
 */

export type StampVideoResult =
  | { status: 'saved'; fileName: string }
  | { status: 'failed'; error: string };

/** Lê dimensões e duração pelo próprio decodificador do navegador. */
export async function probeVideoFile(
  file: File,
): Promise<{ width: number; height: number; durationMs: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('não decodifica'));
    });
    if (!video.videoWidth || !video.videoHeight) return null;
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      durationMs: Number.isFinite(video.duration) ? video.duration * 1000 : 0,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function stampVideoInBrowser({
  file,
  overlay,
  fileName,
  onProgress,
}: {
  file: File;
  overlay: Uint8Array;
  fileName: string;
  onProgress: (percent: number) => void;
}): Promise<StampVideoResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true; // o áudio vai pela captura, não pelos alto-falantes
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('o vídeo não pôde ser decodificado'));
    });

    const width = video.videoWidth;
    const height = video.videoHeight;
    const stampBitmap = await createImageBitmap(
      new Blob([overlay.slice().buffer], { type: 'image/png' }),
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return { status: 'failed', error: 'canvas indisponível' };

    const stream = canvas.captureStream(30);

    // O áudio original entra na gravação quando o navegador oferece a
    // captura do elemento; onde não oferece, o vídeo sai mudo — dito nunca,
    // quebrado nunca: o carimbo é o produto, o áudio é acompanhamento.
    const capturable = video as HTMLVideoElement & { captureStream?: () => MediaStream };
    try {
      const audioTracks = capturable.captureStream?.().getAudioTracks() ?? [];
      for (const track of audioTracks) stream.addTrack(track);
    } catch {
      // Sem captura de áudio neste navegador.
    }

    const recorder = new MediaRecorder(stream, bestRecorderOptions());
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error('a gravação falhou'));
    });

    let running = true;
    const draw = () => {
      if (!running) return;
      context.drawImage(video, 0, 0, width, height);
      context.drawImage(stampBitmap, 0, 0, width, height);
      if (video.duration > 0) {
        onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      }
      requestAnimationFrame(draw);
    };

    recorder.start();
    await video.play();
    draw();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    running = false;
    recorder.stop();
    await finished;
    onProgress(100);

    const outputName = fileName.replace(/\.[^.]+$/, '') + '_lymark.webm';
    const blob = new Blob(chunks, { type: 'video/webm' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = outputName;
    link.click();
    // Revogado depois de um respiro: revogar na mesma volta cancela o
    // download em navegadores que resolvem o clique de forma assíncrona.
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);

    return { status: 'saved', fileName: outputName };
  } catch (error) {
    return { status: 'failed', error: String(error) };
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
  }
}

/** O melhor codec que este navegador aceitar; sem preferido, o padrão dele. */
function bestRecorderOptions(): MediaRecorderOptions {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType, videoBitsPerSecond: 8_000_000 };
    }
  }
  return {};
}
