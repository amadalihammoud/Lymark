/**
 * Largura e altura de uma imagem, lidas do cabeçalho.
 *
 * Substitui o pacote `image-size`, que carregava duas falhas de laço infinito
 * sem correção publicada em versão alguma — CVE-2025-71330, no parser de ICNS,
 * e CVE-2025-71329, nos de HEIF, JP2 e JXL — e ambas com prova de conceito
 * pública. Como a leitura roda de forma síncrona no processo principal do
 * Electron, um laço ali congela a janela inteira, sem recuperação.
 *
 * A defesa antes era uma lista de permissão que barrava os formatos atingidos
 * antes de chamar o pacote. Aqui a propriedade é estrutural: só existem os três
 * formatos que o aplicativo aceita. Não há parser de ICNS, de HEIF, de JP2 nem
 * de JXL para ser alcançado — e o que não existe não precisa ser contido.
 *
 * TERMINAÇÃO — a razão de existir deste arquivo é não travar, então:
 *
 *   - PNG e WebP leem posições fixas. Não há laço.
 *   - JPEG é o único que percorre marcadores. O laço avança pelo menos 2 bytes
 *     por volta (o comprimento declarado é rejeitado se for menor que 2) e é
 *     limitado pelo tamanho do buffer. Qualquer byte fora do lugar devolve
 *     `null` em vez de continuar procurando.
 *
 * As dimensões são as do arquivo, sem aplicar a orientação do EXIF — mesmo
 * comportamento do pacote anterior, para o carimbo não mudar de lugar.
 */

export type ImageDimensions = { width: number; height: number };

/** `null` quando o formato não é reconhecido ou o cabeçalho está truncado. */
export function readImageDimensions(bytes: Buffer): ImageDimensions | null {
  return readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 24) return null;
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  // A norma PNG (11.2.2) exige que o IHDR seja o primeiro chunk, então as
  // dimensões estão sempre nesta posição.
  if (bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * C0–CF são marcadores de início de quadro, com três exceções que só
 * compartilham a faixa: DHT (C4), JPG (C8) e DAC (CC).
 */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readJpeg(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;

    // Uma sequência de 0xFF antes do marcador é preenchimento válido.
    let marker = bytes[offset + 1];
    while (marker === 0xff && offset + 2 < bytes.length) {
      offset += 1;
      marker = bytes[offset + 1];
    }
    offset += 2;

    // Marcadores isolados, sem segmento: reinício e delimitadores.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;

    if (offset + 1 >= bytes.length) return null;

    const length = bytes.readUInt16BE(offset);
    // O comprimento conta a si mesmo; menor que 2 é inválido e, aceito, faria
    // o laço parar de avançar.
    if (length < 2) return null;

    if (isStartOfFrame(marker)) {
      // comprimento(2) precisão(1) altura(2) largura(2)
      if (offset + 7 > bytes.length) return null;
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }

    offset += length;
  }

  return null;
}

function readWebp(bytes: Buffer): ImageDimensions | null {
  // 30 bytes cobrem o maior dos três cabeçalhos possíveis (VP8 e VP8X).
  if (bytes.length < 30) return null;
  if (bytes.subarray(0, 4).toString('latin1') !== 'RIFF') return null;
  if (bytes.subarray(8, 12).toString('latin1') !== 'WEBP') return null;

  // RIFF(4) tamanho(4) WEBP(4) id-do-chunk(4) tamanho-do-chunk(4) → carga em 20.
  switch (bytes.subarray(12, 16).toString('latin1')) {
    case 'VP8 ': {
      // Com perdas: tag de quadro(3) e o código de sincronia 9D 01 2A, depois
      // as duas dimensões em 14 bits cada.
      if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    }

    case 'VP8L': {
      // Sem perdas: assinatura 0x2F e, em seguida, 32 bits com as dimensões
      // menos um, empacotadas em 14 bits cada.
      if (bytes[20] !== 0x2f) return null;
      const packed = bytes.readUInt32LE(21);
      return {
        width: (packed & 0x3fff) + 1,
        height: ((packed >>> 14) & 0x3fff) + 1,
      };
    }

    case 'VP8X': {
      // Estendido: as dimensões da tela, menos um, em 24 bits cada.
      return {
        width: bytes.readUIntLE(24, 3) + 1,
        height: bytes.readUIntLE(27, 3) + 1,
      };
    }

    default:
      return null;
  }
}
