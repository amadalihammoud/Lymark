import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

interface I18nContextType {
  t: (key: string, options?: any) => string;
  i18n: typeof i18n;
  changeLanguage: (lng: string) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { t, i18n: i18nInstance } = useTranslation();

  const changeLanguage = async (lng: string) => {
    await i18nInstance.changeLanguage(lng);
  };

  return (
    <I18nContext.Provider value={{ t, i18n: i18nInstance, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export default I18nContext;