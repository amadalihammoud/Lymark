import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@i18n/locales';

/**
 * O idioma que o aparelho pede, reduzido ao que o Lymark tem.
 *
 * A negociação tenta o mais específico primeiro: etiqueta completa, depois
 * idioma+escrita (`zh-Hant` a partir de `zh-Hant-TW`), depois heurística de
 * região para o chinês (`zh-TW`/`zh-HK` → `zh-Hant`, `zh-CN` → `zh`), e só então
 * a parte primária. Quem está com o aparelho em `pt-PT` ou `pt-BR` continua
 * recebendo português; quem está em `zh-Hant` ou `zh-TW` recebe o catálogo
 * tradicional, sem cair no simplificado só porque a primária é `zh`.
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
 * Exportada para os testes cobrirem as colisões `zh` / `zh-Hant` sem depender
 * do `navigator` do ambiente.
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
  const upper = parts.map((p) => p.toUpperCase());

  // Chinês: região e escrita explícitas antes de cair no catálogo `zh`.
  if (primary === 'zh') {
    if (upper.includes('HANT') || upper.some((p) => p === 'TW' || p === 'HK' || p === 'MO')) {
      if (isLocale('zh-Hant')) return 'zh-Hant';
    }
    if (upper.includes('HANS') || upper.some((p) => p === 'CN' || p === 'SG')) {
      return 'zh';
    }
    // `zh` sem região: o catálogo histórico (simplificado).
    return 'zh';
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
