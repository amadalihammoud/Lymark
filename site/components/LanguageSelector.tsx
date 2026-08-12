'use client';

import { usePathname, useRouter } from '@/i18n/navigation';

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

  const currentLocale = pathname.split('/')[1] || 'pt';

  const handleChange = (locale: string) => {
    if (currentLocale === locale) return;
    const pathWithoutLocale = pathname.split('/').slice(2).join('/');
    router.push('/' + locale + '/' + (pathWithoutLocale || ''));
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <select
        onChange={(e) => handleChange(e.target.value)}
        value={currentLocale}
        aria-label="Select language"
        style={{
          backgroundColor: 'transparent',
          border: '1px solid #555',
          color: '#fff',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
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
