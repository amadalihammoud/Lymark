// O construtor da caixa também existe no desktop, que não importa de `src/`
// — este teste é o que impede as duas montagens de divergirem em silêncio.
// eslint-disable-next-line no-restricted-imports
import { buildSealBox as buildSealBoxDesktop } from '../../../../desktop/video-seal';
import {
  buildSealBox,
  extractSealMp4,
  isMp4,
  stripSealMp4,
} from '../mp4-seal';

/** Um MP4 mínimo: `ftyp` e um `mdat` curtinho. */
function tinyMp4(): Uint8Array {
  return new Uint8Array([
    0x00, 0x00, 0x00, 0x10, 0x66, 0x74, 0x79, 0x70, // ftyp, 16 bytes
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x00, 0x00, 0x00, 0x0b, 0x6d, 0x64, 0x61, 0x74, // mdat, 11 bytes
    0x01, 0x02, 0x03,
  ]);
}

const RECEIPT = 'LYM1.eyJ2IjoxfQ.YXNzaW5hdHVyYQ';

describe('o selo no MP4', () => {
  it('anexa, encontra e remove — e a remoção devolve os bytes originais', () => {
    const mp4 = tinyMp4();
    const sealed = new Uint8Array([...mp4, ...buildSealBox(RECEIPT)]);

    expect(isMp4(sealed)).toBe(true);
    expect(extractSealMp4(sealed)).toBe(RECEIPT);
    expect(Buffer.from(stripSealMp4(sealed))).toEqual(Buffer.from(mp4));
  });

  it('o desktop monta EXATAMENTE a mesma caixa', () => {
    expect(Buffer.from(buildSealBox(RECEIPT))).toEqual(buildSealBoxDesktop(RECEIPT));
  });

  it('arquivo sem selo passa ileso, sem cópia', () => {
    const mp4 = tinyMp4();
    expect(extractSealMp4(mp4)).toBeNull();
    expect(stripSealMp4(mp4)).toBe(mp4);
  });

  it('a caixa do selo só vale no FIM: transplantada para o meio, não autentica', () => {
    const mp4 = tinyMp4();
    const box = buildSealBox(RECEIPT);

    // A: como o app grava — a caixa anexada ao fim.
    const noFim = new Uint8Array([...mp4, ...box]);
    // B: os MESMOS bytes, com a caixa movida para logo depois do `ftyp`.
    // O `ftyp` de `tinyMp4` tem 16 bytes; o `mdat` vem depois.
    const noMeio = new Uint8Array([...mp4.subarray(0, 16), ...box, ...mp4.subarray(16)]);

    expect(noMeio.length).toBe(noFim.length);
    expect(extractSealMp4(noFim)).toBe(RECEIPT);

    /*
     * O ponto do teste. Antes, B também devolvia o recibo e `stripSealMp4`
     * reconstruía o original byte a byte — mesmo hash, mesma assinatura,
     * veredito "Íntegra" na página de verificação. Só que `stco`/`co64` são
     * offsets ABSOLUTOS: num arquivo real, mover a caixa desloca todas as
     * amostras e o arquivo deixa de tocar. Um recibo passava a autenticar um
     * conjunto de arquivos em vez de um.
     */
    expect(extractSealMp4(noMeio)).toBeNull();
    expect(stripSealMp4(noMeio)).toBe(noMeio);
  });

  it('caixa alheia de tipo desconhecido não é confundida com o selo', () => {
    const mp4 = tinyMp4();
    const foreign = new Uint8Array([0x00, 0x00, 0x00, 0x0c, 0x66, 0x72, 0x65, 0x65, 1, 2, 3, 4]);
    const withForeign = new Uint8Array([...mp4, ...foreign]);
    expect(extractSealMp4(withForeign)).toBeNull();
    expect(stripSealMp4(withForeign)).toBe(withForeign);
  });

  it('caixa com tamanho até o fim do arquivo (size 0) não derruba a busca', () => {
    const mp4 = tinyMp4();
    // Reescreve o tamanho do mdat para 0 — "até o fim", como o padrão permite.
    const openEnded = mp4.slice();
    openEnded.set([0, 0, 0, 0], 16);
    expect(extractSealMp4(openEnded)).toBeNull();
  });

  it('não é MP4, não há selo — JPEG e lixo dizem não', () => {
    expect(isMp4(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(extractSealMp4(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
