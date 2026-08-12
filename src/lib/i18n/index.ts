import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ptBR from './translations/pt-BR.json';
import en from './translations/en.json';

// the translations
const resources = {
  'pt-BR': ptBR,
  en: en
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: Localization.locale || 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;