/**
 * As normas do relatório, do lado do desktop.
 *
 * Espelho exato de `src/features/report/norms.ts` — que este diretório não
 * pode importar (o `rootDir` do tsconfig do desktop mudaria a estrutura de
 * saída do tsc, que o electron-builder mapeia para dentro do asar). O teste
 * de paridade em `src/features/report/__tests__/report.test.ts` compara as
 * duas tabelas valor a valor.
 *
 * Vive separado de `report-pdf.ts` porque aquele importa `electron`, e o
 * teste de paridade roda no Jest do aplicativo, onde `electron` não existe.
 */

export const REPORT_NORMS = ['abnt', 'iso'] as const;

export type ReportNorm = (typeof REPORT_NORMS)[number];

/** Margens em centímetros, por norma — espelho de `NORM_SPECS[norm].margins`. */
export const NORM_MARGINS_CM: Record<
  ReportNorm,
  { top: number; right: number; bottom: number; left: number }
> = {
  abnt: { top: 3, right: 2, bottom: 2, left: 3 },
  iso: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
};
