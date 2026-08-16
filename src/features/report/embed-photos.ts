/**
 * Fotos como data-URI — o que torna o documento Word autocontido.
 *
 * O PDF não precisa disto: a janela oculta resolve `media://` na impressão.
 * O `.doc` é um arquivo que viaja sozinho — anexado num e-mail, aberto em
 * outra máquina — e uma referência `media://` lá dentro não resolve em
 * lugar nenhum. Cada foto entra no próprio HTML, reduzida.
 *
 * A redução não é estética, é aritmética: um relatório de 50 fotos de
 * 4000px em base64 passaria de cem megabytes. Reduzida a um teto de
 * 1600px e JPEG 0,82, cada foto fica em algumas centenas de quilobytes —
 * um documento de dezenas de fotos abre sem sofrimento.
 *
 * Módulo desktop-only por natureza (usa fetch/canvas do DOM); o único
 * chamador é a tela do relatório, que já é desktop-only.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export async function photoToDataUri(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;

    const bitmap = await createImageBitmap(await response.blob());
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return null;
  }
}
