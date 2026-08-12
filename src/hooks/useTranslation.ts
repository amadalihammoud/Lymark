// src/hooks/useTranslation.ts
import { useState, useEffect } from 'react';
import i18n, { changeLanguage, supportedLocales, defaultLocale } from '@/i18n';

export const useTranslation = () => {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    const onChange = () => {
      setLocale(i18n.locale);
    };

    i18n.on('change', onChange);
    return () => {
      i18n.off('change', onChange);
    };
  }, []);

  const t = (key: string, params?: Record<string, string | number>) => {
    return i18n.t(key, params);
  };

  const setLanguage = async (newLocale: string) => {
    await changeLanguage(newLocale);
    setLocale(newLocale);
  };

  return {
    t,
    locale,
    setLanguage,
    supportedLocales,
    defaultLocale,
  };
};

export default useTranslation;
