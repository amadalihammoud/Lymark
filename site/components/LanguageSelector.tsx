'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

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

export default function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const handleChange = (newLocale: string) => {
    if (locale === newLocale) return;
    const pathWithoutLocale = pathname.replace(/^/([a-z]{2})/, '');
    router.push('/' + newLocale + pathWithoutLocale);
  };

  const selectStyle = {
    backgroundColor: 'transparent',
    border: '1px solid #555',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <select
        onChange={(e) => handleChange(e.target.value)}
        value={locale}
        aria-label="Select language"
        style={selectStyle}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}