import { DEFAULT_LOCALE, LOCALES, type Locale } from '@i18n/locales';

/**
 * O idioma que o aparelho pede, reduzido ao que o Lymark tem.
 *
 * A negociação é deliberadamente simples: comparamos apenas a parte primária
 * da etiqueta. Quem está com o aparelho em `pt-PT`, `pt-AO` ou `pt-BR` recebe
 * português; `zh-Hant` recebe o catálogo chinês. Distinguir variantes exigiria
 * catálogos que não existem, e escolher o inglês por não haver `pt-PT` exato
 * seria pior do que aproximar.
 */
export function resolveDeviceLocale(): Locale {
  for (const tag of deviceLanguageTags()) {
    const primary = tag.split(/[-_]/)[0]?.toLowerCase();
    const match = LOCALES.find((locale) => locale === primary);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

/**
 * As etiquetas de idioma do aparelho, em ordem de preferência.
 *
 * Lidas do próprio motor de JavaScript, via `Intl`, em vez de um módulo
 * nativo: o Hermes já embarca o ICU completo, e a mesma chamada funciona no
 * Android, no navegador e no Electron — as três plataformas onde este código
 * roda.
 */
function deviceLanguageTags(): string[] {
  const tags: string[] = [];

  // No navegador, `languages` traz a lista inteira que a pessoa configurou,
  // e não só a primeira. Vale mais que o palpite único do `Intl`.
  const fromNavigator = (globalThis as { navigator?: { languages?: readonly string[] } })
    .navigator?.languages;
  if (fromNavigator?.length) tags.push(...fromNavigator);

  try {
    tags.push(new Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Motor sem Intl: cai no padrão. Não é motivo para derrubar o app.
  }

  return tags;
}
