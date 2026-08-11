/**
 * @jest-environment node
 */

import { readImageDimensions } from '../image-dimensions';

/*
 * Os cabeçalhos são montados byte a byte, e não lidos de arquivos de exemplo.
 * O que está sob teste é a interpretação desses bytes: fixtures binárias
 * esconderiam justamente o que precisa ficar à vista, e um caso de rejeição
 * como "ICNS forjado" não tem arquivo de exemplo plausível.
 */

function png(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8); // comprimento do IHDR
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function segment(marker: number, payload: Buffer, fillBytes = 0): Buffer {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2, 0);
  const prefix = Buffer.from([0xff, ...new Array<number>(fillBytes).fill(0xff), marker]);
  return Buffer.concat([prefix, length, payload]);
}

function jpeg(width: number, height: number, { fillBytes = 0, marker = 0xc0 } = {}): Buffer {
  const frame = Buffer.alloc(5);
  frame.writeUInt8(8, 0); // precisão
  frame.writeUInt16BE(height, 1);
  frame.writeUInt16BE(width, 3);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    // Um segmento antes do quadro, para exercitar o avanço por comprimento.
    segment(0xe0, Buffer.alloc(14)),
    segment(marker, frame, fillBytes),
    Buffer.alloc(8),
  ]);
}

function webpHeader(chunk: string): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write('RIFF', 0, 'latin1');
  bytes.write('WEBP', 8, 'latin1');
  bytes.write(chunk, 12, 'latin1');
  return bytes;
}

function webpLossy(width: number, height: number): Buffer {
  const bytes = webpHeader('VP8 ');
  bytes[23] = 0x9d;
  bytes[24] = 0x01;
  bytes[25] = 0x2a;
  bytes.writeUInt16LE(width, 26);
  bytes.writeUInt16LE(height, 28);
  return bytes;
}

function webpLossless(width: number, height: number): Buffer {
  const bytes = webpHeader('VP8L');
  bytes[20] = 0x2f;
  const packed = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  bytes.writeUInt32LE(packed >>> 0, 21);
  return bytes;
}

function webpExtended(width: number, height: number): Buffer {
  const bytes = webpHeader('VP8X');
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

describe('formatos aceitos', () => {
  it('lê PNG', () => {
    expect(readImageDimensions(png(4032, 3024))).toEqual({ width: 4032, height: 3024 });
  });

  it('lê JPEG, atravessando o segmento anterior ao quadro', () => {
    expect(readImageDimensions(jpeg(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('lê JPEG progressivo (SOF2)', () => {
    expect(readImageDimensions(jpeg(800, 600, { marker: 0xc2 }))).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('aceita preenchimento de 0xFF antes do marcador', () => {
    expect(readImageDimensions(jpeg(640, 480, { fillBytes: 3 }))).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('lê WebP com perdas', () => {
    expect(readImageDimensions(webpLossy(1024, 768))).toEqual({ width: 1024, height: 768 });
  });

  it('lê WebP sem perdas', () => {
    expect(readImageDimensions(webpLossless(1024, 768))).toEqual({ width: 1024, height: 768 });
  });

  it('lê WebP estendido', () => {
    expect(readImageDimensions(webpExtended(5000, 4000))).toEqual({ width: 5000, height: 4000 });
  });

  it('lê o maior WebP representável, onde os 14 bits saturam', () => {
    expect(readImageDimensions(webpLossless(16384, 16384))).toEqual({
      width: 16384,
      height: 16384,
    });
  });
});

describe('formatos recusados', () => {
  // Estes são os parsers das falhas que motivaram substituir o `image-size`.
  // Não existem aqui, e a recusa é o que prova isso.
  it('recusa ICNS, alvo do CVE-2025-71330', () => {
    const bytes = Buffer.alloc(32);
    bytes.write('icns', 0, 'latin1');
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('recusa HEIF, alvo do CVE-2025-71329', () => {
    const bytes = Buffer.alloc(32);
    bytes.write('ftypheic', 4, 'latin1');
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('recusa GIF, que é imagem mas não está na lista', () => {
    const bytes = Buffer.alloc(32);
    bytes.write('GIF89a', 0, 'latin1');
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('recusa um WebP cujo chunk não é reconhecido', () => {
    expect(readImageDimensions(webpHeader('ANIM'))).toBeNull();
  });

  it('recusa buffer vazio', () => {
    expect(readImageDimensions(Buffer.alloc(0))).toBeNull();
  });

  it('recusa PNG truncado antes do IHDR', () => {
    expect(readImageDimensions(png(100, 100).subarray(0, 20))).toBeNull();
  });
});

describe('terminação — a propriedade que faltava no pacote anterior', () => {
  it('não trava com comprimento de segmento zero', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]),
      Buffer.alloc(64),
    ]);
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('não trava com um arquivo inteiro de 0xFF', () => {
    const bytes = Buffer.alloc(100_000, 0xff);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('não trava com comprimento que aponta além do buffer', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff]),
      Buffer.alloc(64),
    ]);
    expect(readImageDimensions(bytes)).toBeNull();
  });

  it('não trava com bytes aleatórios após a assinatura JPEG', () => {
    const bytes = Buffer.alloc(50_000);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    for (let i = 2; i < bytes.length; i += 1) bytes[i] = (i * 31 + 7) % 256;
    // Só não pode entrar em laço; achar ou não um quadro é indiferente.
    expect(() => readImageDimensions(bytes)).not.toThrow();
  });
});
