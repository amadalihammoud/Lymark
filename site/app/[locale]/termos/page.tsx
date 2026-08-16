import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../i18n/locales';
import { LEGAL_TAGS } from '../../../components/legal-tags';
import { getLegalTranslator } from '../../../i18n/legal';
import { alternatesFor, canonicalFor } from '../../../i18n/urls';

/** Mesma estrutura da Política de Privacidade — o porquê está descrito lá. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getLegalTranslator(locale as Locale, 'terms');

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: canonicalFor('/termos', locale as Locale),
      languages: alternatesFor('/termos'),
    },
  };
}

/** O título numerado de uma seção. O número é decorativo: o CSS o desenha. */
function Heading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2>
      <span className="num" aria-hidden="true">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default async function Termos({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getLegalTranslator(locale as Locale, 'terms');

  return (
    <article className="doc">
      <h1>{t('title')}</h1>
      <p className="stamp-date">{t('updated')}</p>

      <p className="intro">{t.rich('intro', LEGAL_TAGS)}</p>

      <Heading n="01">{t('s01.title')}</Heading>
      <p>{t.rich('s01.p1', LEGAL_TAGS)}</p>

      <Heading n="02">{t('s02.title')}</Heading>
      <p>{t.rich('s02.p1', LEGAL_TAGS)}</p>
      <ul>
        {(['certify', 'editable', 'clock', 'address', 'code'] as const).map((key) => (
          <li key={key}>{t.rich(`s02.items.${key}`, LEGAL_TAGS)}</li>
        ))}
      </ul>
      <p>{t.rich('s02.p2', LEGAL_TAGS)}</p>

      <Heading n="03">{t('s03.title')}</Heading>
      <ul>
        {(['photos', 'thirdParties', 'prohibited', 'backups'] as const).map((key) => (
          <li key={key}>{t.rich(`s03.items.${key}`, LEGAL_TAGS)}</li>
        ))}
      </ul>

      <Heading n="04">{t('s04.title')}</Heading>
      <p>{t.rich('s04.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s04.p2', LEGAL_TAGS)}</p>

      <Heading n="05">{t('s05.title')}</Heading>
      <p>{t.rich('s05.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s05.p2', LEGAL_TAGS)}</p>

      <Heading n="06">{t('s06.title')}</Heading>
      <p>{t.rich('s06.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s06.p2', LEGAL_TAGS)}</p>

      <Heading n="07">{t('s07.title')}</Heading>
      <p>{t.rich('s07.p1', LEGAL_TAGS)}</p>

      <Heading n="08">{t('s08.title')}</Heading>
      <p>{t.rich('s08.p1', LEGAL_TAGS)}</p>

      <Heading n="09">{t('s09.title')}</Heading>
      <p>{t.rich('s09.p1', LEGAL_TAGS)}</p>

      <p className="note">{t.rich('note', LEGAL_TAGS)}</p>
    </article>
  );
}
