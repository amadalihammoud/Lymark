import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

import { Link } from '../../i18n/navigation';

/*
 * Uma amostra do carimbo, desenhada com as mesmas proporções do aplicativo.
 * Não é uma captura de tela: enquanto não houver fotos reais de campo, uma
 * imagem montada seria uma promessa que o produto ainda não fez.
 *
 * O conteúdo do carimbo — hora, data, endereço e código — não é traduzido:
 * é a reprodução de uma foto brasileira, e traduzir o nome da avenida seria
 * inventar um exemplo que nunca existiu. Só a descrição para leitores de tela
 * e a legenda mudam de idioma.
 */
function Specimen() {
  const t = useTranslations('site.specimen');

  return (
    <div>
      <figure style={{ margin: 0 }}>
        <div className="specimen" role="img" aria-label={t('label')}>
          <p className="brand" aria-hidden="true">
            Ly<em>mark</em>
          </p>
          <p className="code" aria-hidden="true">
            98926A73655DC1
          </p>
          <div className="stamp" aria-hidden="true">
            <div className="row">
              <p className="clock">07:42</p>
              <div className="rule" />
              <div className="stack">
                <span>12 ago. 2026</span>
                <span>Qua</span>
              </div>
            </div>
            <p className="address">Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002</p>
          </div>
        </div>
        <figcaption className="caption">{t('caption')}</figcaption>
      </figure>
    </div>
  );
}

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  const t = useTranslations('site');

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.heading')}</h1>
          <p className="lede">{t('hero.description')}</p>
          <div className="cta">
            <a href="https://app.lymark.app">{t('hero.cta')}</a>
            <span className="note">{t('hero.note')}</span>
          </div>

          <div className="meta">
            <span>{t('hero.meta.android')}</span>
            <span>{t('hero.meta.account')}</span>
            <span>{t('hero.meta.onDevice')}</span>
            <span>{t('hero.meta.language')}</span>
          </div>
        </div>
        <Specimen />
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            01
          </span>
          <h2>{t('features.title')}</h2>
        </div>

        <div className="grid three">
          {(['time', 'address', 'code'] as const).map((key) => (
            <div className="cell" key={key}>
              <p className="field">{t(`features.${key}.field`)}</p>
              <h3>{t(`features.${key}.heading`)}</h3>
              <p>{t(`features.${key}.description`)}</p>
            </div>
          ))}
        </div>

        <p className="note">{t('features.note')}</p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            02
          </span>
          <h2>{t('process.title')}</h2>
        </div>

        <div className="grid three">
          {(['capture', 'save', 'share'] as const).map((key) => (
            <div className="cell" key={key}>
              <p className="field">{t(`process.${key}.field`)}</p>
              <h3>{t(`process.${key}.heading`)}</h3>
              <p>{t(`process.${key}.description`)}</p>
            </div>
          ))}
        </div>

        <p className="note">{t('process.note')}</p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            03
          </span>
          <h2>{t('data.title')}</h2>
        </div>

        <div className="grid">
          {(['device', 'external'] as const).map((key) => (
            <div className="cell" key={key}>
              <p className="field">{t(`data.${key}.field`)}</p>
              <h3>{t(`data.${key}.heading`)}</h3>
              <p>{t(`data.${key}.description`)}</p>
            </div>
          ))}
        </div>

        <p className="note">
          {t.rich('data.note', {
            privacy: (chunks) => <Link href="/privacidade">{chunks}</Link>,
          })}
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            04
          </span>
          <h2>{t('availability.title')}</h2>
        </div>
        <p className="lede">{t('availability.description')}</p>
        <p className="note">
          {t.rich('availability.contact', {
            email: (chunks) => <a href="mailto:contato@lymark.app">{chunks}</a>,
          })}
        </p>
      </section>
    </>
  );
}
