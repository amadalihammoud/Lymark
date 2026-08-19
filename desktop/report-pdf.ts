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

import { NORM_PRINT, type ReportNorm } from './report-norms';

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
 * Cada norma diz onde ele fica (`NORM_PRINT[norm].pageNumber`): no canto
 * superior direito, dentro da margem (a convenção ABNT/DIN), ou no rodapé
 * central, no formato "n / total". A fonte acompanha a serifa do corpo.
 * `pageWord` chega traduzido do renderer — o processo principal não conhece
 * o catálogo do aplicativo.
 */
function headerFooter(norm: ReportNorm, pageWord: string): {
  headerTemplate: string;
  footerTemplate: string;
} {
  const empty = '<span></span>';
  const escaped = pageWord.replace(/[<>&"]/g, '');
  const font = NORM_PRINT[norm].serif
    ? "'Times New Roman',serif"
    : 'Arial,sans-serif';

  if (NORM_PRINT[norm].pageNumber === 'top-right') {
    return {
      headerTemplate:
        `<div style="width:100%;font-size:10px;font-family:${font};` +
        'text-align:right;padding-right:0.4in;"><span class="pageNumber"></span></div>',
      footerTemplate: empty,
    };
  }

  return {
    headerTemplate: empty,
    footerTemplate:
      `<div style="width:100%;font-size:9px;font-family:${font};text-align:center;">${escaped} ` +
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

  /*
   * As mesmas travas que a janela principal tem, e que esta não tinha.
   *
   * `will-navigate` e `setWindowOpenHandler` estão registrados em
   * `mainWindow.webContents` — são por janela, não por aplicativo, então esta
   * nascia sem nenhum dos dois. A `REPORT_CSP` já impede script de rodar
   * aqui, o que torna difícil chegar a `window.open`; mas navegação de topo
   * não é coberta por CSP em lugar nenhum, e uma janela que só existe para
   * imprimir um documento local não tem por que sair de `report://`.
   */
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('report://')) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  try {
    await window.loadURL('report://document/index.html');

    const { margins, pageSize } = NORM_PRINT[norm];
    const { headerTemplate, footerTemplate } = headerFooter(norm, pageWord);

    return await window.webContents.printToPDF({
      pageSize,
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
