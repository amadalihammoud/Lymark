/**
 * Um escritor de ZIP mínimo, em modo "store" (sem compressão).
 *
 * Escrito à mão de propósito, e não por dependência: o conteúdo do pacote
 * do projeto é JPEG e PDF — formatos já comprimidos, onde o deflate ganha
 * um ou dois por cento ao custo de CPU e de uma biblioteca a mais na
 * superfície de ataque do processo principal. O formato ZIP em modo store
 * são três estruturas fixas: cabeçalho local por arquivo, diretório
 * central e o registro de fim (EOCD). Nada além disso é necessário.
 *
 * Limites conhecidos e aceitos: sem ZIP64 (o pacote de um projeto fica
 * muito aquém de 4 GB) e nomes em UTF-8 com o bit 11 ligado, que todo
 * descompactador moderno lê.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = {
  /** Caminho dentro do pacote, com `/` como separador. */
  name: string;
  data: Buffer;
};

/** DOS date/time fixo (1980-01-01): o pacote é reprodutível byte a byte. */
const DOS_TIME = 0;
const DOS_DATE = 0x21;

export function buildZip(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // assinatura do cabeçalho local
    local.writeUInt16LE(20, 4); // versão necessária
    local.writeUInt16LE(0x0800, 6); // bit 11: nome em UTF-8
    local.writeUInt16LE(0, 8); // método: store
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18); // comprimido = original (store)
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // sem campo extra

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); // assinatura do diretório central
    record.writeUInt16LE(20, 4); // criado por
    record.writeUInt16LE(20, 6); // versão necessária
    record.writeUInt16LE(0x0800, 8);
    record.writeUInt16LE(0, 10);
    record.writeUInt16LE(DOS_TIME, 12);
    record.writeUInt16LE(DOS_DATE, 14);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(entry.data.length, 20);
    record.writeUInt32LE(entry.data.length, 24);
    record.writeUInt16LE(name.length, 28);
    // extra, comentário, disco, atributos internos/externos: zero
    record.writeUInt32LE(offset, 42);

    parts.push(local, name, entry.data);
    central.push(record, name);
    offset += local.length + name.length + entry.data.length;
  }

  const directory = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // assinatura do EOCD
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...parts, directory, end]);
}
