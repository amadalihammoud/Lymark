// desktop/menu.ts
import { app, Menu, MenuItemConstructorOptions } from 'electron';
import { supportedLocales, defaultLocale } from './i18n';

// Funcao para criar o menu principal
export function createMenu(currentLocale: string, setLocale: (locale: string) => void): Menu {
  const languageSubmenu: MenuItemConstructorOptions[] = supportedLocales.map((locale) => ({
    label: getLanguageName(locale),
    type: 'radio',
    checked: currentLocale === locale,
    click: () => setLocale(locale),
  }));

  const template: MenuItemConstructorOptions[] = [
    {
      label: getTranslation(currentLocale, 'menu.file'),
      submenu: [
        { 
          label: getTranslation(currentLocale, 'capture.camera'),
          accelerator: 'CmdOrCtrl+N',
          click: () => { /* Abrir camera */ }
        },
        { 
          label: getTranslation(currentLocale, 'gallery.title'),
          accelerator: 'CmdOrCtrl+O',
          click: () => { /* Abrir galeria */ }
        },
        { type: 'separator' },
        { 
          label: getTranslation(currentLocale, 'menu.quit'),
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        },
      ],
    },
    {
      label: getTranslation(currentLocale, 'menu.edit'),
      submenu: [
        { label: getTranslation(currentLocale, 'common.undo'), accelerator: 'CmdOrCtrl+Z' },
        { label: getTranslation(currentLocale, 'common.redo'), accelerator: 'CmdOrCtrl+Shift+Z' },
        { type: 'separator' },
        { label: getTranslation(currentLocale, 'common.cut'), accelerator: 'CmdOrCtrl+X' },
        { label: getTranslation(currentLocale, 'common.copy'), accelerator: 'CmdOrCtrl+C' },
        { label: getTranslation(currentLocale, 'common.paste'), accelerator: 'CmdOrCtrl+V' },
      ],
    },
    {
      label: getTranslation(currentLocale, 'menu.view'),
      submenu: [
        { label: getTranslation(currentLocale, 'menu.zoomIn'), accelerator: 'CmdOrCtrl+=' },
        { label: getTranslation(currentLocale, 'menu.zoomOut'), accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { label: getTranslation(currentLocale, 'menu.fullScreen'), role: 'togglefullscreen' },
      ],
    },
    {
      label: getTranslation(currentLocale, 'menu.settings'),
      submenu: [
        {
          label: getTranslation(currentLocale, 'language.label'),
          submenu: languageSubmenu,
        },
        { type: 'separator' },
        { label: getTranslation(currentLocale, 'settings.watermark'), click: () => { /* Abrir config watermark */ } },
      ],
    },
    {
      label: getTranslation(currentLocale, 'menu.help'),
      submenu: [
        { label: getTranslation(currentLocale, 'about.title'), click: () => { /* Abrir sobre */ } },
        { type: 'separator' },
        { label: 'Documentacao', click: () => { /* Abrir docs */ } },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

// Nomes dos idiomas
function getLanguageName(locale: string): string {
  const names: Record<string, string> = {
    pt: 'Portugues',
    en: 'English',
    es: 'Espanol',
    fr: 'Francais',
    it: 'Italiano',
    de: 'Deutsch',
    nl: 'Nederlands',
    ru: 'Russkiy',
    zh: 'Zhongwen',
    ja: 'Nihongo',
    ko: 'Hangugeo',
    ar: 'Arabi',
  };
  return names[locale] || locale;
}

// Funcao para traduzir
function getTranslation(locale: string, key: string): string {
  const translations: Record<string, Record<string, string>> = {
    pt: require('./i18n/pt.json'),
    en: require('./i18n/en.json'),
    es: require('./i18n/es.json'),
    fr: require('./i18n/fr.json'),
    it: require('./i18n/it.json'),
    de: require('./i18n/de.json'),
    nl: require('./i18n/nl.json'),
    ru: require('./i18n/ru.json'),
    zh: require('./i18n/zh.json'),
    ja: require('./i18n/ja.json'),
    ko: require('./i18n/ko.json'),
    ar: require('./i18n/ar.json'),
  };
  
  const lang = translations[locale as keyof typeof translations];
  if (!lang) return key;
  
  const keys = key.split('.');
  let value: any = lang;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  return value as string;
}
