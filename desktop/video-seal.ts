import crypto from 'crypto';
import fs from 'fs';

/**
 * O selo de vídeo no processo principal — as duas metades baratas.
 *
 * O desenho canônico mora em `src/features/attest/mp4-seal.ts`; este arquivo
 * espelha a montagem da caixa `lymk` porque o processo principal não importa
 * de `src/` (a saída do tsc do desktop depende de os arquivos ficarem dentro
 * da pasta — ver o comentário do i18n no electron-builder.yml). O teste
 * `video-seal.test.ts` prova que as duas montagens produzem os MESMOS bytes,
 * que é o que impede a divergência silenciosa.
 *
 * Por que aqui e não no renderer: selar um vídeo de um giga é um `append` de
 * ~300 bytes e um hash por STREAM — nada disso deve atravessar a ponte IPC
 * como array, nem passar perto da memória do WebAssembly.
 */

const SEAL_PREFIX = 'lymark-selo:';
const MAX_RECEIPT_LENGTH = 4096;

export function buildSealBox(receipt: string): Buffer {
  const text = SEAL_PREFIX + receipt;
  if (text.length > MAX_RECEIPT_LENGTH) throw new Error('recibo grande demais');
  if (!/^[\x20-\x7e]*$/.test(text)) throw new Error('recibo com caractere fora do ASCII');

  const size = 8 + text.length;
  const box = Buffer.alloc(size);
  box.writeUInt32BE(size, 0);
  box.write('lymk', 4, 'ascii');
  box.write(text, 8, 'ascii');
  return box;
}

/** SHA-256 do arquivo, por stream, em base64url. */
export function hashFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('base64url')));
  });
}

/** Anexa a caixa do selo ao fim do arquivo. */
export function appendSealBox(filePath: string, receipt: string): void {
  fs.appendFileSync(filePath, buildSealBox(receipt));
}
