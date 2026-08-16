/**
 * A impressão do relatório em PDF.
 *
 * O renderer monta o HTML (com os textos já traduzidos e as imagens em
 * `media://gallery/…`) e entrega aqui. Este módulo o serve pelo esquema
 * `report://` a uma janela OCULTA e sem preload — página estática, nenhuma
 * ponte exposta — espera as imagens carregarem e chama `printToPDF`.
 *
 * Margens e número de página são do Chromium (`margins` +
 * `displayHeaderFooter`), por norma, e não do CSS: `@page` com contadores de
 * página não é suportado pelo motor, e o cabeçalho nativo é o que numera
 * certo em qualquer quantidade de páginas.
 *
 * A tabela de normas existe TAMBÉM em `src/features/report/norms.ts`, que
 * este arquivo não pode importar (o `rootDir` do tsconfig do desktop mudaria
 * a estrutura de saída do tsc). O teste de paridade em
 * `src/features/report/__tests__/report.test.ts` impede as duas cópias de
 * divergirem em silêncio.
 */

import { BrowserWindow } from 'electron';

import { NORM_MARGINS_CM, type ReportNorm } from './report-norms';

export { REPORT_NORMS, type ReportNorm } from './report-norms';

const CM_PER_INCH = 2.54;

const cmToInches = (cm: number) => cm / CM_PER_INCH;

/** O HTML pendente, servido por `report://`. Um relatório por vez. */
let pendingHtml: string | null = null;

/** Lido pelo protocolo `report://` enquanto a janela oculta carrega. */
export function pendingReportHtml(): string | null {
  return pendingHtml;
}

/**
 * Número de página nos cabeçalhos nativos do Chromium.
 *
 * ABNT: canto superior direito, na área da margem. ISO: rodapé central, no
 * formato "n / total". `pageWord` chega traduzido do renderer — o processo
 * principal não conhece o catálogo do aplicativo.
 */
function headerFooter(norm: ReportNorm, pageWord: string): {
  headerTemplate: string;
  footerTemplate: string;
} {
  const empty = '<span></span>';
  const escaped = pageWord.replace(/[<>&"]/g, '');

  if (norm === 'abnt') {
    return {
      headerTemplate:
        '<div style="width:100%;font-size:10px;font-family:\'Times New Roman\',serif;' +
        'text-align:right;padding-right:0.4in;"><span class="pageNumber"></span></div>',
      footerTemplate: empty,
    };
  }

  return {
    headerTemplate: empty,
    footerTemplate:
      `<div style="width:100%;font-size:9px;font-family:Arial,sans-serif;text-align:center;">${escaped} ` +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  };
}

/**
 * Renderiza o HTML numa janela oculta e devolve os bytes do PDF.
 *
 * A janela nasce sem preload, sem integração com Node e em sandbox: a página
 * é conteúdo estático montado por nós, mas contém texto vindo do usuário —
 * o isolamento não é opcional. `did-finish-load` só dispara depois de os
 * subrecursos (as fotos, via `media://`) carregarem.
 */
export async function renderReportPdf(
  html: string,
  norm: ReportNorm,
  pageWord: string,
): Promise<Buffer> {
  if (pendingHtml !== null) throw new Error('Já há um relatório em andamento.');
  pendingHtml = html;

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    await window.loadURL('report://document/index.html');

    const margins = NORM_MARGINS_CM[norm];
    const { headerTemplate, footerTemplate } = headerFooter(norm, pageWord);

    return await window.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margins: {
        top: cmToInches(margins.top),
        right: cmToInches(margins.right),
        bottom: cmToInches(margins.bottom),
        left: cmToInches(margins.left),
      },
    });
  } finally {
    pendingHtml = null;
    if (!window.isDestroyed()) window.destroy();
  }
}
