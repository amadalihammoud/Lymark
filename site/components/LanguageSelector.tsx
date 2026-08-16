'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { LOCALES_BY_NAME, LOCALE_NAMES, type Locale } from '../../i18n/locales';
import { usePathname, useRouter } from '../i18n/navigation';

/**
 * Um `<select>` nativo, de propósito.
 *
 * O componente do sistema operacional já sabe rolar listas longas, responder
 * ao teclado e ler em voz alta — e são doze idiomas, escritos em cinco
 * alfabetos. Um menu desenhado à mão teria de reconquistar cada uma dessas
 * coisas para ficar no mesmo lugar.
 */
export default function LanguageSelector() {
  const t = useTranslations('app.language');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    if (next === locale) return;

    // A troca de idioma é uma navegação: mantém o mesmo caminho e muda apenas
    // o prefixo, para quem está lendo os Termos continuar nos Termos.
    startTransition(() => {
      router.replace(pathname, { locale: next as Locale });
    });
  }

  return (
    <select
      className="language"
      value={locale}
      disabled={isPending}
      aria-label={t('selector')}
      onChange={(event) => handleChange(event.target.value)}
    >
      {LOCALES_BY_NAME.map((code) => (
        <option key={code} value={code}>
          {LOCALE_NAMES[code]}
        </option>
      ))}
    </select>
  );
}
