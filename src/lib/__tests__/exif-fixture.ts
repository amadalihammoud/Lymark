/**
 * Um JPEG mínimo com bloco EXIF, montado byte a byte.
 *
 * Existe para que os testes de `exif.ts` exercitem o módulo de verdade, e não
 * a ausência dele: um buffer vazio só prova que a função devolve `undefined`.
 * Com o arquivo montado aqui dá para afirmar o que sai carimbado na foto — que
 * é a coisa que importa.
 *
 * A tag usada é `DateTime` (0x0132), na IFD0, porque é a que cabe num arquivo
 * deste tamanho e o módulo já a lê como alternativa ao `DateTimeOriginal`.
 */

/** Monta um JPEG com um único segmento APP1 contendo a data informada. */
export function jpegComExif(dataHora: string): Buffer {
  // ASCII terminado em NUL, como manda a especificação TIFF para o tipo 2.
  const texto = Buffer.from(`${dataHora}\0`, 'ascii');

  /*
   * Bloco TIFF, em big-endian ("MM"):
   *
   *   0  cabeçalho TIFF ......... 8 bytes
   *   8  quantidade de entradas . 2 bytes
   *  10  entrada DateTime ...... 12 bytes
   *  22  ponteiro da próxima IFD  4 bytes (zero: não há)
   *  26  o texto da data
   */
  const tiff = Buffer.alloc(26 + texto.length);
  tiff.write('MM', 0, 'ascii');
  tiff.writeUInt16BE(0x002a, 2);
  tiff.writeUInt32BE(8, 4);

  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0132, 10); // DateTime
  tiff.writeUInt16BE(2, 12); // tipo ASCII
  tiff.writeUInt32BE(texto.length, 14);
  tiff.writeUInt32BE(26, 18); // onde o texto começa, dentro do bloco TIFF
  tiff.writeUInt32BE(0, 22);
  texto.copy(tiff, 26);

  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);

  // O tamanho declarado no APP1 inclui os próprios dois bytes de tamanho.
  const marcador = Buffer.alloc(4);
  marcador.writeUInt16BE(0xffe1, 0);
  marcador.writeUInt16BE(payload.length + 2, 2);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    marcador,
    payload,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}
