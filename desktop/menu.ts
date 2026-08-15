/**
 * O menu do sistema.
 *
 * Sem um menu explícito, o Electron instala o dele — em inglês, com "Help" e
 * "Toggle Developer Tools", no meio de um aplicativo traduzido para doze
 * idiomas. Esta é a única parte da janela que a página não desenha, e por
 * isso é a única que precisa ser traduzida aqui.
 *
 * Os `role` continuam sendo usados: são eles que dão o comportamento correto
 * de desfazer, colar e zoom em cada sistema operacional, além dos atalhos de
 * teclado padrão. Só o rótulo vem do catálogo.
 */

import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

import { translate } from './i18n';

export function buildApplicationMenu(locale: string, window: BrowserWindow | null): void {
  const t = (key: string) => translate(locale, key);

  const template: MenuItemConstructorOptions[] = [
    {
      label: t('desktop.menu.file'),
      submenu: [{ role: 'quit', label: t('desktop.menu.quit') }],
    },
    {
      label: t('desktop.menu.edit'),
      submenu: [
        { role: 'undo', label: t('desktop.menu.undo') },
        { role: 'redo', label: t('desktop.menu.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('desktop.menu.cut') },
        { role: 'copy', label: t('desktop.menu.copy') },
        { role: 'paste', label: t('desktop.menu.paste') },
        { role: 'selectAll', label: t('desktop.menu.selectAll') },
      ],
    },
    {
      label: t('desktop.menu.view'),
      submenu: [
        { role: 'reload', label: t('desktop.menu.reload') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('desktop.menu.zoomReset') },
        { role: 'zoomIn', label: t('desktop.menu.zoomIn') },
        { role: 'zoomOut', label: t('desktop.menu.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('desktop.menu.fullscreen') },
      ],
    },
    {
      label: t('desktop.menu.settings'),
      submenu: [
        {
          label: t('app.language.label'),
          // O menu não desenha a tela de idioma: ele leva até ela. A lista de
          // idiomas já existe na interface, e duplicá-la aqui criaria dois
          // lugares para escolher a mesma coisa — que discordariam no dia em
          // que um idioma novo entrasse.
          click: () => navigate(window, '/settings/language'),
        },
      ],
    },
    {
      label: t('desktop.menu.help'),
      submenu: [
        {
          label: t('app.about.title'),
          click: () => navigate(window, '/settings/about'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Leva a janela a uma rota do aplicativo.
 *
 * A navegação acontece dentro da página, pelo roteador do Expo, e não por
 * recarregamento: recarregar descartaria o rascunho de captura — a foto
 * escolhida e os campos preenchidos — que é justamente o que o aplicativo
 * promete não perder ao navegar.
 */
function navigate(window: BrowserWindow | null, route: string): void {
  if (!window || window.isDestroyed()) return;

  window.webContents.send('navigate', route);
}
