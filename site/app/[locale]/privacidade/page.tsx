import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '../../../../i18n/locales';
import { LEGAL_TAGS } from '../../../components/legal-tags';
import { getLegalTranslator } from '../../../i18n/legal';
import { alternatesFor, canonicalFor } from '../../../i18n/urls';

/**
 * A Política de Privacidade, nos doze idiomas.
 *
 * O texto mora em `i18n/messages/legal/`, e não neste arquivo — o porquê da
 * separação está em `site/i18n/legal.ts`. Aqui fica só a estrutura, que é a
 * mesma nos doze: é ela que o CSS estiliza (`h2 > span.num`, `dl.deftable`) e é
 * por ela que a tradução não pode mexer.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getLegalTranslator(locale as Locale, 'privacy');

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    /*
     * Agora que o documento existe nos doze idiomas, cada um é canônico de si e
     * declara os outros onze — o que `canonicalFor` e `alternatesFor` já fazem
     * sozinhos a partir de `translated: true` em `i18n/urls.ts`.
     */
    alternates: {
      canonical: canonicalFor('/privacidade', locale as Locale),
      languages: alternatesFor('/privacidade'),
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

export default async function Privacidade({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getLegalTranslator(locale as Locale, 'privacy');

  return (
    <article className="doc">
      <h1>{t('title')}</h1>
      <p className="stamp-date">{t('updated')}</p>

      <p className="intro">{t.rich('intro', LEGAL_TAGS)}</p>

      <Heading n="01">{t('s01.title')}</Heading>
      <p>{t.rich('s01.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s01.p2', LEGAL_TAGS)}</p>

      {/*
       * PENDENTE, e é decisão do Amad com o advogado: se o aplicativo for
       * oferecido no Espaço Econômico Europeu, o art. 27 do RGPD exige um
       * representante estabelecido na UE, com nome e contato publicados aqui.
       * A alternativa é restringir a distribuição ao Brasil na Play Console e
       * na App Store Connect.
       *
       * Isto era um `<span className="todo">` renderizado na página: o recado
       * ao advogado estava público, nos doze prefixos. Enquanto não houver
       * representante nomeado, não dizer nada é a afirmação correta — a
       * pendência é do repositório, não do leitor.
       */}
      <Heading n="02">{t('s02.title')}</Heading>
      <p>{t.rich('s02.p1', LEGAL_TAGS)}</p>

      <Heading n="03">{t('s03.title')}</Heading>
      <p>{t.rich('s03.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s03.p2', LEGAL_TAGS)}</p>

      <Heading n="04">{t('s04.title')}</Heading>
      <p>{t.rich('s04.p1', LEGAL_TAGS)}</p>

      <dl className="deftable">
        {(['photos', 'location', 'datetime', 'code', 'history', 'preferences'] as const).map(
          (key) => (
            <div key={key}>
              <dt>{t(`s04.defs.${key}.term`)}</dt>
              <dd>{t.rich(`s04.defs.${key}.def`, LEGAL_TAGS)}</dd>
            </div>
          ),
        )}
      </dl>

      <p style={{ marginTop: '1.5rem' }}>{t.rich('s04.p2', LEGAL_TAGS)}</p>

      <Heading n="05">{t('s05.title')}</Heading>
      <p>{t.rich('s05.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s05.p2', LEGAL_TAGS)}</p>
      <p>{t.rich('s05.p3', LEGAL_TAGS)}</p>

      <Heading n="06">{t('s06.title')}</Heading>
      <dl className="deftable">
        {(['camera', 'photos', 'location'] as const).map((key) => (
          <div key={key}>
            <dt>{t(`s06.defs.${key}.term`)}</dt>
            <dd>{t.rich(`s06.defs.${key}.def`, LEGAL_TAGS)}</dd>
          </div>
        ))}
      </dl>
      <p style={{ marginTop: '1.5rem' }}>{t.rich('s06.p1', LEGAL_TAGS)}</p>

      <Heading n="07">{t('s07.title')}</Heading>
      <p>{t.rich('s07.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s07.p2', LEGAL_TAGS)}</p>
      <p>{t.rich('s07.p3', LEGAL_TAGS)}</p>

      <Heading n="08">{t('s08.title')}</Heading>
      <p>{t.rich('s08.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s08.p2', LEGAL_TAGS)}</p>

      <Heading n="09">{t('s09.title')}</Heading>
      <p>{t.rich('s09.p1', LEGAL_TAGS)}</p>

      <Heading n="10">{t('s10.title')}</Heading>
      <p>{t.rich('s10.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s10.p2', LEGAL_TAGS)}</p>
      <p>{t.rich('s10.p3', LEGAL_TAGS)}</p>

      <Heading n="11">{t('s11.title')}</Heading>
      <p>{t.rich('s11.p1', LEGAL_TAGS)}</p>

      <Heading n="12">{t('s12.title')}</Heading>
      <p>{t.rich('s12.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s12.p2', LEGAL_TAGS)}</p>
      <p>{t.rich('s12.p3', LEGAL_TAGS)}</p>

      <Heading n="13">{t('s13.title')}</Heading>
      <p>{t.rich('s13.p1', LEGAL_TAGS)}</p>

      <Heading n="14">{t('s14.title')}</Heading>
      <p>{t.rich('s14.p1', LEGAL_TAGS)}</p>
      <p>{t.rich('s14.p2', LEGAL_TAGS)}</p>

      <Heading n="15">{t('s15.title')}</Heading>
      <p>{t.rich('s15.p1', LEGAL_TAGS)}</p>

      <Heading n="16">{t('s16.title')}</Heading>
      <p>{t.rich('s16.p1', LEGAL_TAGS)}</p>

      <Heading n="17">{t('s17.title')}</Heading>
      <p>{t.rich('s17.p1', LEGAL_TAGS)}</p>

      <p className="note">{t.rich('note', LEGAL_TAGS)}</p>
    </article>
  );
}
