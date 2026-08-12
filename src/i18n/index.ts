// src/i18n/index.ts
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar traducoes
import pt from './pt.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import de from './de.json';
import nl from './nl.json';
import ru from './ru.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import ar from './ar.json';

// Tipos
type Translations = typeof pt;

export const translations: Record<string, Translations> = {
  pt,
  en,
  es,
  fr,
  it,
  de,
  nl,
  ru,
  zh,
  ja,
  ko,
  ar,
};

// Idiomas suportados
export const supportedLocales = Object.keys(translations);

// Idioma padrao
export const defaultLocale = 'pt';

// Criar instancia do i18n
const i18n = new I18n(translations);

// Configurar idioma inicial
export const initI18n = async () => {
  try {
    // Tentar pegar idioma salvo
    const savedLocale = await AsyncStorage.getItem('@lymark/locale');
    
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      i18n.locale = savedLocale;
    } else {
      // Usar idioma do dispositivo
      const deviceLocale = Localization.locale.split('-')[0];
      if (supportedLocales.includes(deviceLocale)) {
        i18n.locale = deviceLocale;
      } else {
        i18n.locale = defaultLocale;
      }
    }
  } catch {
    i18n.locale = defaultLocale;
  }
  
  // Configurar fallback
  i18n.enableFallback = true;
  i18n.defaultLocale = defaultLocale;
};

// Funcao para mudanca de idioma
export const changeLanguage = async (locale: string) => {
  if (supportedLocales.includes(locale)) {
    i18n.locale = locale;
    await AsyncStorage.setItem('@lymark/locale', locale);
  }
};

// Exportar instancia
export default i18n;
