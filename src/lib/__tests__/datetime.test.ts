import {
  formatDate,
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
