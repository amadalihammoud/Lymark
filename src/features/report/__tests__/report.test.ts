// A tabela de margens também existe no desktop, que não importa de `src/` —
// este teste é o que impede as duas cópias de divergirem em silêncio.
// eslint-disable-next-line no-restricted-imports
import { NORM_PRINT, REPORT_NORMS as DESKTOP_NORMS } from '../../../../desktop/report-norms';
import type { GalleryEntry } from '@/types';
import { NORM_SPECS, REPORT_NORMS } from '../norms';
import { groupByProject } from '../projects';
import { buildReportHtml, escapeHtml, type ReportInput, type ReportStrings } from '../report-html';

function entry(overrides: Partial<GalleryEntry> & { code?: string } = {}): GalleryEntry {
  const { code = '', ...rest } = overrides;
  return {
    id: Math.random().toString(36).slice(2),
    path: 'exports/abc.jpg',
    exportedAt: '2026-08-16T12:00:00.000Z',
    metadata: { time: '10:00', date: '16/08/2026', weekday: 'sábado', address: 'Rua A, 1', code },
    stampedFields: ['time', 'date', 'address', 'code'],
    ...rest,
  };
}

const STRINGS: ReportStrings = {
  fields: { time: 'Hora', date: 'Data', weekday: 'Dia', address: 'Endereço', code: 'Código' },
  summary: 'Resumo',
  photosSection: 'Registros',
  photoLabel: (index) => `Foto ${index}`,
  exportedAt: 'Exportada em',
  generatedAt: 'Gerado em',
  totalPhotos: 'Total:',
  author: 'Responsável',
  code: 'Código',
  declaration: 'Declaração do emissor.',
  signature: 'Assinatura do responsável',
};

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    norm: 'abnt',
    title: 'Relatório de obra',
    author: 'AutoGlass',
    code: 'OBRA-1',
    generatedAtLabel: '16/08/2026 12:00',
    photos: [
      { entry: entry({ code: 'OBRA-1' }), src: 'media://gallery/a.jpg' },
      { entry: entry({ code: 'OBRA-1' }), src: 'media://gallery/b.jpg' },
    ],
    strings: STRINGS,
    ...overrides,
  };
}

describe('os projetos — a galeria agrupada por código', () => {
  it('agrupa por código com trim, nomeados primeiro e sem-código por último', () => {
    const projects = groupByProject([
      entry({ code: 'B' }),
      entry({ code: '' }),
      entry({ code: ' A ' }),
      entry({ code: 'A' }),
    ]);

    expect(projects.map((p) => p.code)).toEqual(['A', 'B', '']);
    expect(projects[0].entries).toHaveLength(2);
  });

  it('ordena as fotos de cada projeto da mais antiga para a mais nova', () => {
    const older = entry({ code: 'X', exportedAt: '2026-01-01T00:00:00.000Z' });
    const newer = entry({ code: 'X', exportedAt: '2026-06-01T00:00:00.000Z' });
    const [project] = groupByProject([newer, older]);

    expect(project.entries.map((e) => e.exportedAt)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ]);
  });
});

describe('o HTML do relatório', () => {
  it('escapa texto vindo do usuário', () => {
    expect(escapeHtml('<img src=x onerror="a">')).not.toContain('<img');

    const html = buildReportHtml(
      input({ title: '<script>alert(1)</script>', author: 'A & B' }),
      'pt',
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('traz uma seção por foto, com os campos carimbados e a imagem', () => {
    const html = buildReportHtml(input(), 'pt');

    expect(html.match(/<section class="photo">/g)).toHaveLength(2);
    expect(html).toContain('media://gallery/a.jpg');
    expect(html).toContain('Rua A, 1');
    // `weekday` não está em stampedFields — não pode aparecer na ficha.
    expect(html).not.toContain('<th>Dia</th>');
  });

  it('cada norma imprime com a sua tipografia', () => {
    const abnt = buildReportHtml(input({ norm: 'abnt' }), 'pt');
    const iso = buildReportHtml(input({ norm: 'iso' }), 'pt');

    expect(abnt).toContain('Times New Roman');
    expect(abnt).toContain('text-transform: uppercase');
    expect(iso).toContain('Arial');
    expect(iso).not.toContain('text-transform: uppercase');
  });

  it('o logo entra na capa quando pedido, e some quando o interruptor desliga', () => {
    const uri = 'data:image/png;base64,AAAA';
    expect(buildReportHtml(input({ logoDataUri: uri }), 'pt')).toContain(`class="logo" src="${uri}"`);
    expect(buildReportHtml(input({ logoDataUri: '' }), 'pt')).not.toContain('class="logo"');
    expect(buildReportHtml(input(), 'pt')).not.toContain('class="logo"');
  });

  it('o bloco de assinatura existe só nas normas com estrutura de laudo', () => {
    expect(buildReportHtml(input({ norm: 'ibape' }), 'pt')).toContain('class="signature"');
    expect(buildReportHtml(input({ norm: 'abnt' }), 'pt')).not.toContain('class="signature"');
  });

  it('o papel Carta é exclusividade da norma dos EUA', () => {
    const letterOnly = REPORT_NORMS.filter((norm) => NORM_SPECS[norm].pageSize === 'Letter');
    expect(letterOnly).toEqual(['letter']);
  });

  it('campo vazio na tabela-resumo vira travessão, não célula em branco', () => {
    const bare = entry();
    bare.metadata.address = '';
    const html = buildReportHtml(input({ photos: [{ entry: bare, src: 'media://gallery/c.jpg' }] }), 'pt');
    expect(html).toContain('<td>—</td>');
  });
});

describe('a paridade com o desktop', () => {
  it('as normas, papel, margens e numeração são EXATAMENTE os mesmos nos dois lados', () => {
    expect([...DESKTOP_NORMS]).toEqual([...REPORT_NORMS]);
    for (const norm of REPORT_NORMS) {
      expect(NORM_PRINT[norm].margins).toEqual(NORM_SPECS[norm].margins);
      expect(NORM_PRINT[norm].pageSize).toBe(NORM_SPECS[norm].pageSize);
      expect(NORM_PRINT[norm].pageNumber).toBe(NORM_SPECS[norm].pageNumber);
      // O cabeçalho nativo acompanha a serifa do corpo.
      expect(NORM_PRINT[norm].serif).toBe(NORM_SPECS[norm].fontFamily.includes('Times'));
    }
  });
});
