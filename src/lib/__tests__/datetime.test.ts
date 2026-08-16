import {
  DATE_PATTERN,
  MONTHS,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
} from '@i18n/calendar';
import { LOCALES } from '@i18n/locales';

import {
  formatDate,
  convertTimeFormat,
  formatTime,
  formatTimestamp,
  formatWeekday,
  formatWeekdayFull,
} from '../datetime';

/**
 * O formato exibido é parte do produto: é o que fica impresso na foto e
 * eventualmente num laudo. Estes testes travam o formato para que ele não
 * mude sem alguém perceber.
 */
describe('formatação de data e hora', () => {
  // 1 de agosto de 2026, 11:04 — um sábado, como na tela de referência.
  const reference = new Date(2026, 7, 1, 11, 4);

  it('formata a hora com dois dígitos', () => {
    expect(formatTime(reference)).toBe('11:04');
    expect(formatTime(new Date(2026, 7, 1, 9, 7))).toBe('09:07');
    expect(formatTime(new Date(2026, 7, 1, 0, 0))).toBe('00:00');
  });

  it('12 horas: sem zero à esquerda, meia-noite 12 AM e meio-dia 12 PM', () => {
    expect(formatTime(new Date(2026, 7, 1, 14, 30), '12h')).toBe('2:30 PM');
    expect(formatTime(new Date(2026, 7, 1, 9, 7), '12h')).toBe('9:07 AM');
    expect(formatTime(new Date(2026, 7, 1, 0, 0), '12h')).toBe('12:00 AM');
    expect(formatTime(new Date(2026, 7, 1, 12, 0), '12h')).toBe('12:00 PM');
  });

  it('a conversão preserva o valor — e só toca no que o app escreveu', () => {
    expect(convertTimeFormat('14:30', '12h')).toBe('2:30 PM');
    expect(convertTimeFormat('00:05', '12h')).toBe('12:05 AM');
    expect(convertTimeFormat('12:00', '12h')).toBe('12:00 PM');
    expect(convertTimeFormat('2:30 PM', '24h')).toBe('14:30');
    expect(convertTimeFormat('12:05 AM', '24h')).toBe('00:05');
    expect(convertTimeFormat('12:00 PM', '24h')).toBe('12:00');
    // Já está no formato pedido: devolve como está.
    expect(convertTimeFormat('14:30', '24h')).toBe('14:30');
    // Texto da pessoa: intocável.
    expect(convertTimeFormat('por volta das 14h', '12h')).toBeNull();
    expect(convertTimeFormat('25:99', '12h')).toBeNull();
  });

  it('formata a data no padrão pt-BR abreviado', () => {
    expect(formatDate(reference)).toBe('01 ago. 2026');
    expect(formatDate(new Date(2026, 0, 31))).toBe('31 jan. 2026');
    expect(formatDate(new Date(2026, 11, 9))).toBe('09 dez. 2026');
  });

  it('devolve o dia da semana abreviado e por extenso', () => {
    expect(formatWeekday(reference)).toBe('Sáb');
    expect(formatWeekdayFull(reference)).toBe('Sábado');
    expect(formatWeekday(new Date(2026, 7, 2))).toBe('Dom');
    expect(formatWeekday(new Date(2026, 7, 3))).toBe('Seg');
  });

  it('monta o carimbo curto do histórico', () => {
    expect(formatTimestamp(reference.toISOString())).toBe('01 ago. 2026 · 11:04');
  });

  it('não quebra com uma data inválida vinda do armazenamento', () => {
    expect(formatTimestamp('não é uma data')).toBe('—');
    expect(formatTimestamp('')).toBe('—');
  });
});

/**
 * O carimbo é o produto. Traduzir a interface e deixar a foto saindo com
 * "ago." e "Qua" para um técnico alemão seria entregar metade.
 */
describe('o carimbo em cada idioma', () => {
  // Quarta-feira, 12 de agosto de 2026 — a mesma data da amostra do site.
  const quarta = new Date(2026, 7, 12, 7, 42);

  it.each([
    ['pt', '12 ago. 2026', 'Qua'],
    ['en', '12 Aug 2026', 'Wed'],
    ['es', '12 ago. 2026', 'mié'],
    ['fr', '12 août 2026', 'mer.'],
    ['it', '12 ago 2026', 'mer'],
    ['de', '12. Aug. 2026', 'Mi'],
    ['nl', '12 aug. 2026', 'wo'],
    ['ru', '12 авг. 2026', 'ср'],
    ['ko', '2026년 8월 12일', '수'],
    ['ar', '12 أغسطس 2026', 'أربعاء'],
  ] as const)('%s', (locale, data, dia) => {
    expect(formatDate(quarta, locale)).toBe(data);
    expect(formatWeekday(quarta, locale)).toBe(dia);
  });

  it('chinês e japonês escrevem ano-mês-dia, como a língua manda', () => {
    // Inverter isso para caber num molde ocidental produziria uma data que
    // ninguém escreve nesses idiomas.
    expect(formatDate(quarta, 'zh')).toBe('2026年8月12日');
    expect(formatDate(quarta, 'ja')).toBe('2026年8月12日');
  });

  it('o francês não abrevia março, maio, junho e agosto', () => {
    // Irregularidade real do idioma: por isso o token guarda a própria
    // pontuação em vez de o padrão acrescentar um ponto a todos.
    expect(formatDate(new Date(2026, 2, 3), 'fr')).toBe('03 mars 2026');
    expect(formatDate(new Date(2026, 7, 3), 'fr')).toBe('03 août 2026');
    expect(formatDate(new Date(2026, 0, 3), 'fr')).toBe('03 janv. 2026');
  });

  it('a hora é 24 horas em todo idioma, inclusive em inglês', () => {
    // Leitura única vale mais que hábito local num carimbo de comprovação.
    const tarde = new Date(2026, 7, 12, 19, 42);

    expect(formatTime(tarde)).toBe('19:42');
  });

  it('sem idioma, continua em português', () => {
    // Esquecer de passar o idioma degrada para o comportamento antigo, e
    // não para uma exceção no meio de uma captura.
    expect(formatDate(quarta)).toBe('12 ago. 2026');
    expect(formatWeekdayFull(quarta)).toBe('Quarta-feira');
  });

  it('todo idioma tem doze meses e sete dias', () => {
    for (const locale of LOCALES) {
      expect(MONTHS[locale]).toHaveLength(12);
      expect(WEEKDAYS_SHORT[locale]).toHaveLength(7);
      expect(WEEKDAYS_LONG[locale]).toHaveLength(7);
      expect(DATE_PATTERN[locale]).toMatch(/\{d\}.*|\{y\}.*/);
    }
  });
});
