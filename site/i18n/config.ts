// site/i18n/config.ts
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['pt', 'en', 'es', 'fr', 'it', 'de', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as string)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

export { locales };
