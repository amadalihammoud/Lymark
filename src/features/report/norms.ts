/**
 * Normas de formatação do relatório.
 *
 * O que uma "norma" define aqui é FORMATAÇÃO de documento — papel, margens,
 * fonte, entrelinha, onde fica o número da página — e não conteúdo pericial.
 * O relatório sai "no padrão ABNT" no sentido tipográfico (NBR 14724): é
 * apresentável a quem espera esse padrão, sem prometer laudo normatizado.
 * O mesmo vale para o estilo IBAPE: a ESTRUTURA de um laudo (com bloco de
 * assinatura do responsável), não a promessa de laudo pericial — laudo de
 * verdade exige responsável técnico habilitado, e isso é de quem assina.
 *
 * O conjunto é uma tabela aberta de propósito: cada norma nova é uma linha,
 * sem tocar o motor. As linhas de hoje:
 *
 * - `abnt` — NBR 14724 (Brasil): margens 3/2 cm, serifa 12, entrelinha 1,5.
 * - `iso` — neutra internacional: A4, 2,5 cm, sem serifa.
 * - `letter` — papel Carta com margens de 1 polegada, a convenção dos EUA
 *   e Canadá (lá não existe uma "ABNT"; o papel é a diferença que importa).
 * - `din5008` — DIN 5008 (Alemanha): A4, esquerda 2,5 cm / direita 2 cm,
 *   sem serifa, número no canto superior direito.
 * - `ibape` — a formatação da ABNT com a estrutura de laudo: bloco de
 *   assinatura do responsável no fim do documento.
 */

export const REPORT_NORMS = ['abnt', 'iso', 'letter', 'din5008', 'ibape'] as const;

export type ReportNorm = (typeof REPORT_NORMS)[number];

export type NormSpec = {
  /** Papel do documento — o Chromium conhece os dois pelo nome. */
  pageSize: 'A4' | 'Letter';
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
  /** Bloco de assinatura do responsável no fim (estrutura de laudo). */
  signatureBlock: boolean;
};

const SERIF = "'Times New Roman', 'Liberation Serif', serif";
const SANS = "Arial, Helvetica, 'Liberation Sans', sans-serif";

/**
 * As especificações, uma por norma.
 *
 * Papel, margens e posição do número existem TAMBÉM em
 * `desktop/report-norms.ts`, que não pode importar de `src/` (layout de
 * saída do tsc). O teste de paridade em `__tests__/report.test.ts` é o que
 * impede as duas cópias de divergirem.
 */
export const NORM_SPECS: Record<ReportNorm, NormSpec> = {
  abnt: {
    pageSize: 'A4',
    margins: { top: 3, right: 2, bottom: 2, left: 3 },
    fontFamily: SERIF,
    fontSizePt: 12,
    lineHeight: 1.5,
    pageNumber: 'top-right',
    uppercaseTitle: true,
    signatureBlock: false,
  },
  iso: {
    pageSize: 'A4',
    margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
    fontFamily: SANS,
    fontSizePt: 11,
    lineHeight: 1.4,
    pageNumber: 'bottom-center',
    uppercaseTitle: false,
    signatureBlock: false,
  },
  letter: {
    pageSize: 'Letter',
    // Uma polegada nos quatro lados — a convenção do papel Carta.
    margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
    fontFamily: SANS,
    fontSizePt: 11,
    lineHeight: 1.4,
    pageNumber: 'bottom-center',
    uppercaseTitle: false,
    signatureBlock: false,
  },
  din5008: {
    pageSize: 'A4',
    margins: { top: 2.5, right: 2, bottom: 2, left: 2.5 },
    fontFamily: SANS,
    fontSizePt: 11,
    lineHeight: 1.3,
    pageNumber: 'top-right',
    uppercaseTitle: false,
    signatureBlock: false,
  },
  ibape: {
    pageSize: 'A4',
    margins: { top: 3, right: 2, bottom: 2, left: 3 },
    fontFamily: SERIF,
    fontSizePt: 12,
    lineHeight: 1.5,
    pageNumber: 'top-right',
    uppercaseTitle: true,
    signatureBlock: true,
  },
};
