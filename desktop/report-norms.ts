/**
 * As normas do relatório, do lado do desktop — só o que a IMPRESSÃO usa.
 *
 * Espelho de `src/features/report/norms.ts` — que este diretório não pode
 * importar (o `rootDir` do tsconfig do desktop mudaria a estrutura de saída
 * do tsc, que o electron-builder mapeia para dentro do asar). O teste de
 * paridade em `src/features/report/__tests__/report.test.ts` compara as
 * duas tabelas valor a valor.
 *
 * Vive separado de `report-pdf.ts` porque aquele importa `electron`, e o
 * teste de paridade roda no Jest do aplicativo, onde `electron` não existe.
 */

export const REPORT_NORMS = ['abnt', 'iso', 'letter', 'din5008', 'ibape'] as const;

export type ReportNorm = (typeof REPORT_NORMS)[number];

export type NormPrint = {
  pageSize: 'A4' | 'Letter';
  /** Margens em centímetros — espelho de `NORM_SPECS[norm].margins`. */
  margins: { top: number; right: number; bottom: number; left: number };
  pageNumber: 'top-right' | 'bottom-center';
  /** O cabeçalho/rodapé nativo acompanha a serifa do corpo do documento. */
  serif: boolean;
};

export const NORM_PRINT: Record<ReportNorm, NormPrint> = {
  abnt: {
    pageSize: 'A4',
    margins: { top: 3, right: 2, bottom: 2, left: 3 },
    pageNumber: 'top-right',
    serif: true,
  },
  iso: {
    pageSize: 'A4',
    margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
    pageNumber: 'bottom-center',
    serif: false,
  },
  letter: {
    pageSize: 'Letter',
    margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
    pageNumber: 'bottom-center',
    serif: false,
  },
  din5008: {
    pageSize: 'A4',
    margins: { top: 2.5, right: 2, bottom: 2, left: 2.5 },
    pageNumber: 'top-right',
    serif: false,
  },
  ibape: {
    pageSize: 'A4',
    margins: { top: 3, right: 2, bottom: 2, left: 3 },
    pageNumber: 'top-right',
    serif: true,
  },
};
