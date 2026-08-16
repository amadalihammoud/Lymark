import type { GalleryEntry } from '@/types';
import { buildSummaryCsv } from '../summary-csv';

const STRINGS = {
  index: '#',
  fields: { time: 'Hora', date: 'Data', weekday: 'Dia', address: 'Endereço', code: 'Código' },
  exportedAt: 'Exportada em',
};

function entry(overrides: Partial<GalleryEntry['metadata']> = {}): GalleryEntry {
  return {
    id: 'x',
    path: 'exports/a.jpg',
    exportedAt: '2026-08-16T12:00:00.000Z',
    metadata: { time: '10:00', date: '16/08/2026', weekday: 'sábado', address: 'Rua A, 1', code: 'OBRA-1', ...overrides },
    stampedFields: ['time', 'date', 'weekday', 'address', 'code'],
  };
}

describe('a tabela-resumo em CSV', () => {
  it('sai com BOM, ponto e vírgula e CRLF — o que o Excel espera', () => {
    const csv = buildSummaryCsv([entry()], STRINGS);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"#";"Hora";"Data";"Dia";"Endereço";"Código";"Exportada em"');
    expect(csv).toContain('\r\n');
  });

  it('endereço com ponto e vírgula e aspas não quebra a tabela', () => {
    const csv = buildSummaryCsv([entry({ address: 'Av. "B"; sala 2' })], STRINGS);
    expect(csv).toContain('"Av. ""B""; sala 2"');
  });

  it('campo não carimbado sai vazio — não afirma dado que não está na foto', () => {
    const e = entry({ address: 'Rua nunca carimbada' });
    e.stampedFields = ['time', 'date'];
    const csv = buildSummaryCsv([e], STRINGS);
    expect(csv).not.toContain('Rua nunca carimbada');
    // A célula fica vazia (aspas sem conteúdo), não com o valor guardado.
    expect(csv).toContain('"10:00";"16/08/2026"');
  });
});
