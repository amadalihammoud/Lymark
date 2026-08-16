import { WATERMARK_FIELD_KEYS, type GalleryEntry, type WatermarkFieldKey } from '@/types';

/**
 * A tabela-resumo do relatório em CSV — para quem controla obra em planilha.
 *
 * Decisões de compatibilidade, todas por causa do Excel:
 *
 * - **BOM UTF-8** no início: sem ele, o Excel do Windows abre acento como
 *   lixo (mojibake) — o defeito clássico de CSV brasileiro.
 * - **Ponto e vírgula** como separador: é o que o Excel espera em qualquer
 *   sistema configurado para português, espanhol, francês ou alemão, onde a
 *   vírgula é o separador decimal.
 * - Aspas duplicadas por escape, célula sempre entre aspas — endereço com
 *   ponto e vírgula ou quebra de linha não quebra a tabela.
 */

/** Cabeçalhos já traduzidos, na ordem das colunas. */
export type SummaryCsvStrings = {
  index: string;
  fields: Record<WatermarkFieldKey, string>;
  exportedAt: string;
};

function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildSummaryCsv(entries: GalleryEntry[], strings: SummaryCsvStrings): string {
  const header = [
    strings.index,
    ...WATERMARK_FIELD_KEYS.map((key) => strings.fields[key]),
    strings.exportedAt,
  ];

  // Mesma regra da tabela-resumo do PDF: só o que foi de fato carimbado.
  // Um campo que nunca chegou à imagem fica vazio na planilha, e não afirma
  // um dado que não está na foto.
  const rows = entries.map((entry, index) => [
    String(index + 1),
    ...WATERMARK_FIELD_KEYS.map((key) =>
      entry.stampedFields.includes(key) ? entry.metadata[key].trim() : '',
    ),
    entry.exportedAt,
  ]);

  const body = [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
  return `\uFEFF${body}\r\n`;
}
