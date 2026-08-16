/**
 * Normas de formatação do relatório.
 *
 * O que uma "norma" define aqui é FORMATAÇÃO de documento — margens, fonte,
 * entrelinha, onde fica o número da página — e não conteúdo pericial. O
 * relatório sai "no padrão ABNT" no sentido tipográfico (NBR 14724): é
 * apresentável a quem espera esse padrão, sem prometer laudo normatizado.
 *
 * O conjunto é uma tabela aberta de propósito: normas de outros países
 * entram como novas linhas, sem tocar o motor. `iso` é o padrão neutro
 * internacional (A4, margens de 2,5 cm, fonte sem serifa), para quem entrega
 * fora do Brasil.
 */

export const REPORT_NORMS = ['abnt', 'iso'] as const;

export type ReportNorm = (typeof REPORT_NORMS)[number];

export type NormSpec = {
  /** Margens da página, em centímetros — o `printToPDF` as converte. */
  margins: { top: number; right: number; bottom: number; left: number };
  /** Família tipográfica do corpo do documento. */
  fontFamily: string;
  /** Corpo do texto, em pontos. */
  fontSizePt: number;
  /** Entrelinha do corpo. */
  lineHeight: number;
  /** Onde o número de página é impresso. */
  pageNumber: 'top-right' | 'bottom-center';
  /** Título da capa em caixa alta? (convenção ABNT) */
  uppercaseTitle: boolean;
};

/**
 * As especificações, uma por norma.
 *
 * ABNT (NBR 14724): superior e esquerda 3 cm, inferior e direita 2 cm,
 * serifa corpo 12, entrelinha 1,5, número de página no canto superior
 * direito. ISO/neutra: 2,5 cm nos quatro lados, sem serifa, número
 * centralizado no rodapé.
 *
 * Esta tabela existe TAMBÉM em `desktop/report-pdf.ts`, que não pode
 * importar de `src/` (layout de saída do tsc). O teste de paridade em
 * `__tests__/report.test.ts` é o que impede as duas cópias de divergirem.
 */
export const NORM_SPECS: Record<ReportNorm, NormSpec> = {
  abnt: {
    margins: { top: 3, right: 2, bottom: 2, left: 3 },
    fontFamily: "'Times New Roman', 'Liberation Serif', serif",
    fontSizePt: 12,
    lineHeight: 1.5,
    pageNumber: 'top-right',
    uppercaseTitle: true,
  },
  iso: {
    margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
    fontFamily: "Arial, Helvetica, 'Liberation Sans', sans-serif",
    fontSizePt: 11,
    lineHeight: 1.4,
    pageNumber: 'bottom-center',
    uppercaseTitle: false,
  },
};
