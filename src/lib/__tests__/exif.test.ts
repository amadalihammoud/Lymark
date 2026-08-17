import { extractDateFromExif, extractDateTimeFromExif, extractTimeFromExif } from '../exif';

import { jpegComExif } from './exif-fixture';

/**
 * O que é lido do EXIF vai impresso na foto, então o que estes testes
 * verificam é o texto carimbado — não o caminho do código.
 *
 * A data de uma foto de lote precisa sair **idêntica** à digitada à mão na aba
 * Capturar: mesma tabela de meses, mesmo idioma, mesma pontuação. Foi
 * justamente aí que morava o defeito antigo — este módulo montava a data por
 * conta própria, com `toLocaleString('pt-BR')`, e o lote saía em português com
 * a interface em outro idioma.
 */

const FOTO = jpegComExif('2026:08:01 21:55:00');

describe('extractDateTimeFromExif', () => {
  it('lê data, hora e o `Date` correspondente', async () => {
    const resultado = await extractDateTimeFromExif(FOTO);

    expect(resultado?.date).toBe('2026-08-01');
    expect(resultado?.time).toBe('21:55:00');
    expect(resultado?.dateTime?.getFullYear()).toBe(2026);
    expect(resultado?.dateTime?.getMonth()).toBe(7); // agosto
    expect(resultado?.dateTime?.getDate()).toBe(1);
    expect(resultado?.dateTime?.getHours()).toBe(21);
  });

  it('devolve `undefined` para arquivo sem EXIF, sem lançar', async () => {
    // O lote não pode parar porque uma foto veio de captura de tela.
    expect(await extractDateTimeFromExif(Buffer.from(''))).toBeUndefined();
  });
});

describe('extractDateFromExif', () => {
  it('sai no formato do carimbo, com o dia em dois dígitos', async () => {
    expect(await extractDateFromExif(FOTO, 'pt')).toBe('01 ago. 2026');
  });

  it('segue o idioma do carimbo', async () => {
    expect(await extractDateFromExif(FOTO, 'en')).toBe('01 Aug 2026');
    expect(await extractDateFromExif(FOTO, 'de')).toBe('01. Aug. 2026');
    expect(await extractDateFromExif(FOTO, 'ru')).toBe('01 авг. 2026');
  });

  it('sem idioma, cai no português — o padrão do produto', async () => {
    // Esquecer o parâmetro degrada para o comportamento antigo, não quebra.
    expect(await extractDateFromExif(FOTO)).toBe('01 ago. 2026');
  });

  it('não repete o ponto da abreviação', async () => {
    // O defeito antigo: o mês vinha do ICU do aparelho já com ponto ("ago.") e
    // o molde acrescentava outro, produzindo "1 ago.. 2026" em umas versões e
    // "1 ago. 2026" em outras. A tabela fixa fecha essa porta.
    expect(await extractDateFromExif(FOTO, 'pt')).not.toContain('..');
  });

  it('devolve `undefined` para arquivo sem EXIF', async () => {
    expect(await extractDateFromExif(Buffer.from(''))).toBeUndefined();
  });
});

describe('extractTimeFromExif', () => {
  it('sai em 24 horas, sem os segundos', async () => {
    expect(await extractTimeFromExif(FOTO)).toBe('21:55');
  });

  it('zera à esquerda, para o bloco não deslocar', async () => {
    expect(await extractTimeFromExif(jpegComExif('2026:08:01 07:04:09'))).toBe('07:04');
  });

  it('devolve `undefined` para arquivo sem EXIF', async () => {
    expect(await extractTimeFromExif(Buffer.from(''))).toBeUndefined();
  });
});

/**
 * O lote do desktop não tem caminho de disco: a foto chega por `media://`, e
 * os bytes vêm de um `fetch`. É um `Uint8Array` puro — sem `Buffer`, que não
 * existe no renderer do Electron (`nodeIntegration: false`, `sandbox: true`).
 *
 * Este teste existe porque o caminho já quebrou de duas formas: passando a
 * URI onde se esperava caminho (data sumia em silêncio) e passando o
 * `.buffer` de um `Buffer` do Node, que é uma janela sobre um pool de 8 KB —
 * o leitor procurava o EXIF no lixo em volta.
 */
describe('bytes em memória — o caminho do desktop', () => {
  it('lê o EXIF de um `Uint8Array` puro, sem `Buffer`', async () => {
    const bytes = new Uint8Array(jpegComExif('2026:08:01 21:55:00'));

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(await extractDateTimeFromExif(bytes)).toMatchObject({
      date: '2026-08-01',
      time: '21:55:00',
    });
  });

  it('lê igual quando os bytes são uma janela sobre um buffer maior', async () => {
    // Reproduz o pool do Node: os bytes da foto no MEIO de um buffer grande.
    const foto = jpegComExif('2026:08:01 07:04:09');
    const pool = new Uint8Array(8192);
    pool.set(foto, 4976);
    const janela = pool.subarray(4976, 4976 + foto.byteLength);

    expect(janela.byteOffset).toBe(4976);
    expect(await extractTimeFromExif(janela)).toBe('07:04');
  });
});
