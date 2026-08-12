// desktop/renderer/components/LanguageSelector.tsx
import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    lymark: {
      getLocale: () => Promise<{ locale: string }>;
      setLocale: (locale: string) => Promise<{ success: boolean }>;
    };
  }
}

const languages = [
  { code: 'pt', name: 'Portugues' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Espanol' },
  { code: 'fr', name: 'Francais' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Russkiy' },
  { code: 'zh', name: 'Zhongwen' },
  { code: 'ja', name: 'Nihongo' },
  { code: 'ko', name: 'Hangugeo' },
  { code: 'ar', name: 'Arabi' },
];

export function LanguageSelector() {
  const [locale, setLocale] = useState<string>('pt');

  useEffect(() => {
    // Carregar idioma atual
    window.lymark.getLocale().then(({ locale: current }) => {
      setLocale(current);
    });
  }, []);

  const handleChange = async (newLocale: string) => {
    const result = await window.lymark.setLocale(newLocale);
    if (result.success) {
      setLocale(newLocale);
      // Recarregar a pagina para aplicar o novo idioma
      window.location.reload();
    }
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      style={{
        padding: '0.5rem',
        borderRadius: '0.25rem',
        border: '1px solid #555',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code} style={{ color: '#000' }}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}

export default LanguageSelector;
