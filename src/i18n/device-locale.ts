import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@i18n/locales';

/**
 * O idioma que o aparelho pede, reduzido ao que o Lymark tem.
 *
 * A negociação tenta o mais específico primeiro: etiqueta completa, depois
 * idioma+escrita (`zh-Hant` a partir de `zh-Hant-TW`), depois heurística de
 * região (chinês, português europeu, espanhol peninsular / latino-americano,
 * inglês britânico / australiano, francês canadense), e só então a parte
 * primária. Quem está com o aparelho em `pt-BR` continua no catálogo
 * brasileiro; `pt-PT` recebe o europeu. `es-MX` e demais regiões
 * latino-americanas caem em `es-419`; `es-ES` no peninsular. `en-GB` /
 * `en-AU` caem em `en-GB`; `fr-CA` no francês canadense.
 */
export function resolveDeviceLocale(): Locale {
  for (const tag of deviceLanguageTags()) {
    const match = matchTag(tag);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

/**
 * Resolve uma etiqueta BCP-47 / underscores ao catálogo mais próximo.
 *
 * Exportada para os testes cobrirem as colisões regionais sem depender do
 * `navigator` do ambiente.
 */
export function matchTag(tag: string): Locale | undefined {
  const normalized = tag.trim().replace(/_/g, '-');
  if (!normalized) return undefined;

  const parts = normalized.split('-').filter(Boolean);
  if (parts.length === 0) return undefined;

  const lowerFull = parts.join('-').toLowerCase();
  const exact = LOCALES.find((locale) => locale.toLowerCase() === lowerFull);
  if (exact) return exact;

  // idioma + Script (zh-Hant a partir de zh-Hant-TW / zh-Hans-CN)
  if (parts.length >= 2) {
    const langScript = `${parts[0]}-${parts[1]}`.toLowerCase();
    const withScript = LOCALES.find((locale) => locale.toLowerCase() === langScript);
    if (withScript) return withScript;
  }

  const primary = parts[0]!.toLowerCase();
  // Subtags after the language — never treat `pt`/`es` themselves as region PT/ES.
  const regions = parts.slice(1).map((p) => p.toUpperCase());

  // Chinês: região e escrita explícitas antes de cair no catálogo `zh`.
  if (primary === 'zh') {
    if (regions.includes('HANT') || regions.some((p) => p === 'TW' || p === 'HK' || p === 'MO')) {
      if (isLocale('zh-Hant')) return 'zh-Hant';
    }
    if (regions.includes('HANS') || regions.some((p) => p === 'CN' || p === 'SG')) {
      return 'zh';
    }
    // `zh` sem região: o catálogo histórico (simplificado).
    return 'zh';
  }

  // Português: `pt-PT` é catálogo próprio; demais regiões (BR, AO, …) → `pt`.
  if (primary === 'pt') {
    if (regions.some((p) => p === 'PT')) {
      if (isLocale('pt-PT')) return 'pt-PT';
    }
    return 'pt';
  }

  // Espanhol: peninsular vs latino-americano vs catálogo histórico `es`.
  if (primary === 'es') {
    if (regions.some((p) => p === 'ES')) {
      if (isLocale('es-ES')) return 'es-ES';
    }
    if (
      regions.some((p) => p === '419') ||
      regions.some((p) =>
        [
          'MX',
          'AR',
          'CO',
          'CL',
          'PE',
          'VE',
          'EC',
          'GT',
          'CU',
          'BO',
          'DO',
          'HN',
          'PY',
          'SV',
          'NI',
          'PA',
          'CR',
          'UY',
          'PR',
        ].includes(p),
      )
    ) {
      if (isLocale('es-419')) return 'es-419';
    }
    // `es` sem região (ou região não listada): catálogo histórico.
    return 'es';
  }

  // Inglês: `en-GB` / `en-AU` → britânico; demais regiões / bare `en` → `en`.
  if (primary === 'en') {
    if (regions.some((p) => p === 'GB' || p === 'AU' || p === 'UK')) {
      if (isLocale('en-GB')) return 'en-GB';
    }
    return 'en';
  }

  // Francês: `fr-CA` é catálogo próprio; demais regiões / bare `fr` → `fr`.
  if (primary === 'fr') {
    if (regions.some((p) => p === 'CA')) {
      if (isLocale('fr-CA')) return 'fr-CA';
    }
    return 'fr';
  }

  return LOCALES.find((locale) => locale === primary);
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
