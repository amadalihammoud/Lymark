import { WATERMARK_FIELD_KEYS, type GalleryEntry, type WatermarkFieldKey } from '@/types';
import { NORM_SPECS, type ReportNorm } from './norms';

/**
 * O documento do relatório — HTML autocontido, pronto para virar PDF.
 *
 * Este módulo é deliberadamente puro: recebe dados e textos já traduzidos,
 * devolve uma string. Nada de rede, nada de plataforma — é o que o torna
 * testável e o que permite que a MESMA montagem sirva qualquer norma.
 *
 * Quem imprime é o processo principal do Electron (janela oculta +
 * `printToPDF`), servindo este HTML pelo esquema `report://`. As imagens
 * entram por `media://gallery/…`, o mesmo protocolo da galeria — o PDF é
 * montado sem nenhum byte de foto atravessando a ponte IPC.
 */

/** Os textos do documento, já no idioma da interface. */
export type ReportStrings = {
  /** Rótulos dos campos do carimbo, na ordem de `WATERMARK_FIELD_KEYS`. */
  fields: Record<WatermarkFieldKey, string>;
  summary: string;
  photosSection: string;
  /** Ex.: "Foto {index}" já resolvido pelo chamador? Não: recebe o prefixo e o número entra aqui. */
  photoLabel: (index: number) => string;
  exportedAt: string;
  generatedAt: string;
  totalPhotos: string;
  author: string;
  code: string;
  /** A separação de camadas do selo, dita também no papel. */
  declaration: string;
  /** Rótulo do bloco de assinatura (normas com estrutura de laudo). */
  signature: string;
};

export type ReportPhoto = {
  entry: GalleryEntry;
  /** URI exibível da imagem (no desktop, `media://gallery/…`). */
  src: string;
};

export type ReportInput = {
  norm: ReportNorm;
  title: string;
  /**
   * Logotipo da capa, como data URL — vazio omite. É OPCIONAL por decisão:
   * a tela tem o interruptor, e desligado o documento sai sem logo.
   */
  logoDataUri?: string;
  /** Responsável/empresa — vazio omite a linha. */
  author: string;
  /** Código do projeto — vazio omite a linha. */
  code: string;
  /** Momento da geração, já formatado no idioma da interface. */
  generatedAtLabel: string;
  photos: ReportPhoto[];
  strings: ReportStrings;
};

/** Escapa texto vindo do usuário antes de entrar no HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Data/hora de exportação legível, a partir do ISO gravado na galeria. */
function formatExportedAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale);
}

function stampRows(photo: ReportPhoto, strings: ReportStrings, locale: string): string {
  const { metadata, stampedFields, exportedAt } = photo.entry;

  const rows = WATERMARK_FIELD_KEYS.filter(
    (key) => stampedFields.includes(key) && metadata[key].trim(),
  ).map(
    (key) =>
      `<tr><th>${escapeHtml(strings.fields[key])}</th><td>${escapeHtml(metadata[key].trim())}</td></tr>`,
  );

  rows.push(
    `<tr><th>${escapeHtml(strings.exportedAt)}</th><td>${escapeHtml(
      formatExportedAt(exportedAt, locale),
    )}</td></tr>`,
  );

  return rows.join('');
}

function summaryRow(photo: ReportPhoto, index: number, strings: ReportStrings): string {
  const { metadata, stampedFields } = photo.entry;
  // A MESMA regra da ficha por foto: só entra o que foi DE FATO carimbado.
  // Um campo preenchido numa sessão e nunca aplicado à imagem não pode
  // aparecer na tabela-resumo como se fosse parte do registro fotográfico.
  const value = (key: 'date' | 'time' | 'address' | 'code') =>
    stampedFields.includes(key) && metadata[key].trim() ? metadata[key].trim() : '—';

  const cells = [String(index + 1), value('date'), value('time'), value('address'), value('code')];
  return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
}

/**
 * Monta o HTML completo do relatório.
 *
 * Estrutura: capa (página própria), tabela-resumo e, em seguida, um registro
 * por foto — imagem com a ficha dos campos que foram DE FATO carimbados
 * naquela foto (`stampedFields`), mais o momento da exportação. Listar campo
 * que nunca chegou à imagem afirmaria algo falso sobre um registro
 * fotográfico — a mesma regra do detalhe da galeria.
 *
 * As margens NÃO ficam no CSS: são do `printToPDF`, por norma, junto com o
 * número de página (cabeçalho/rodapé nativos do Chromium). O CSS cuida do
 * resto — tipografia, quebras e a capa.
 */
export function buildReportHtml(input: ReportInput, locale: string): string {
  const spec = NORM_SPECS[input.norm];
  const { strings } = input;

  const title = escapeHtml(input.title.trim());
  const author = escapeHtml(input.author.trim());
  const code = escapeHtml(input.code.trim());

  const photoBlocks = input.photos
    .map(
      (photo, index) => `
      <section class="photo">
        <h3>${escapeHtml(strings.photoLabel(index + 1))}</h3>
        <img src="${escapeHtml(photo.src)}" alt="" />
        <table class="stamp">${stampRows(photo, strings, locale)}</table>
      </section>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { font-family: ${spec.fontFamily}; font-size: ${spec.fontSizePt}pt; }
  body { line-height: ${spec.lineHeight}; color: #000; background: #fff; }

  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    page-break-after: always;
  }
  .cover .logo { max-height: 2.5cm; max-width: 8cm; object-fit: contain; margin-top: 0.5cm; }
  .cover .author { margin-top: 1cm; font-weight: bold; }
  .cover .title-block { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.5cm; }
  .cover h1 { font-size: 1.5em; ${spec.uppercaseTitle ? 'text-transform: uppercase;' : ''} }
  .cover .generated { margin-bottom: 1cm; }

  h2 { font-size: 1.15em; margin: 0 0 0.5cm; ${spec.uppercaseTitle ? 'text-transform: uppercase;' : ''} }

  table.summary { width: 100%; border-collapse: collapse; margin-bottom: 0.8cm; }
  table.summary th, table.summary td {
    border: 1px solid #000;
    padding: 0.15cm 0.25cm;
    text-align: left;
    vertical-align: top;
    font-size: 0.85em;
  }
  table.summary th { font-weight: bold; }

  .photos { page-break-before: always; }
  section.photo { page-break-inside: avoid; margin-bottom: 1cm; }
  section.photo h3 { font-size: 1em; margin-bottom: 0.3cm; }
  section.photo img {
    display: block;
    max-width: 100%;
    max-height: 15cm;
    object-fit: contain;
    margin-bottom: 0.3cm;
  }
  table.stamp { border-collapse: collapse; width: 100%; }
  table.stamp th, table.stamp td {
    border: 1px solid #999;
    padding: 0.12cm 0.25cm;
    text-align: left;
    vertical-align: top;
    font-size: 0.85em;
  }
  table.stamp th { font-weight: bold; width: 4cm; }

  .declaration { margin-top: 0.8cm; font-size: 0.85em; font-style: italic; }

  .signature { margin-top: 2cm; page-break-inside: avoid; text-align: center; }
  .signature .line { width: 9cm; margin: 0 auto 0.2cm; border-bottom: 1px solid #000; height: 1.2cm; }
</style>
</head>
<body>
  <header class="cover">
    ${input.logoDataUri ? `<img class="logo" src="${escapeHtml(input.logoDataUri)}" alt="" />` : ''}
    ${author ? `<p class="author">${author}</p>` : '<p class="author"></p>'}
    <div class="title-block">
      <h1>${title}</h1>
      ${code ? `<p>${escapeHtml(strings.code)}: ${code}</p>` : ''}
    </div>
    <p class="generated">${escapeHtml(strings.generatedAt)} ${escapeHtml(input.generatedAtLabel)}</p>
  </header>

  <h2>${escapeHtml(strings.summary)}</h2>
  <p>${escapeHtml(strings.totalPhotos)} ${input.photos.length}${
    author ? ` — ${escapeHtml(strings.author)}: ${author}` : ''
  }</p>
  <table class="summary">
    <tr>
      <th>#</th>
      <th>${escapeHtml(strings.fields.date)}</th>
      <th>${escapeHtml(strings.fields.time)}</th>
      <th>${escapeHtml(strings.fields.address)}</th>
      <th>${escapeHtml(strings.fields.code)}</th>
    </tr>
    ${input.photos.map((photo, index) => summaryRow(photo, index, strings)).join('')}
  </table>

  <div class="photos">
    <h2>${escapeHtml(strings.photosSection)}</h2>
    ${photoBlocks}
  </div>

  <p class="declaration">${escapeHtml(strings.declaration)}</p>
${
  spec.signatureBlock
    ? `  <div class="signature">
    <div class="line"></div>
    ${author ? `<p>${author}</p>` : ''}
    <p>${escapeHtml(strings.signature)}</p>
  </div>
`
    : ''
}</body>
</html>`;
}
