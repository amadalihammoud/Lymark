import type { Locale } from '../../i18n/locales';

/**
 * O código de idioma no formato que o Open Graph exige: `idioma_TERRITÓRIO`.
 *
 * Não é o mesmo código do `hreflang`, e a diferença é deliberada. O `hreflang`
 * declara para **quem** a página serve, e ali o código puro é o certo: a
 * tradução é para o idioma, não para um país. O Open Graph declara em que
 * variante o texto está escrito, e o formato dele não aceita idioma sozinho —
 * o Facebook descarta o valor e cai no padrão, que é `en_US`.
 *
 * O território escolhido é o da variante em que o texto foi de fato escrito, e
 * não o país mais populoso do idioma. `pt_BR` porque o texto é brasileiro;
 * `es_ES` porque o espanhol foi escrito na norma peninsular.
 */
export const OG_LOCALES: Record<Locale, string> = {
  pt: 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  de: 'de_DE',
  nl: 'nl_NL',
  ru: 'ru_RU',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  // O Facebook usa `ar_AR` para o árabe, sem território real — é o código que
  // ele reconhece.
  ar: 'ar_AR',
  hi: 'hi_IN',
  sw: 'sw_KE',
  id: 'id_ID',
  ms: 'ms_MY',
  bn: 'bn_BD',
  ur: 'ur_PK',
  tr: 'tr_TR',
  vi: 'vi_VN',
  ro: 'ro_RO',
  uk: 'uk_UA',
  el: 'el_GR',
  pl: 'pl_PL',
  th: 'th_TH',
  fa: 'fa_IR',
  sr: 'sr_RS',
  am: 'am_ET',
  cs: 'cs_CZ',
  he: 'he_IL',
  my: 'my_MM',
  uz: 'uz_UZ',
  ne: 'ne_NP',
  hu: 'hu_HU',
  kk: 'kk_KZ',
  ps: 'ps_AF',
  so: 'so_SO',
  sv: 'sv_SE',
  az: 'az_AZ',
  mg: 'mg_MG',
  si: 'si_LK',
  km: 'km_KH',
  rw: 'rw_RW',
  ht: 'ht_HT',
  bg: 'bg_BG',
  da: 'da_DK',
  fi: 'fi_FI',
  sk: 'sk_SK',
  hr: 'hr_HR',
  ka: 'ka_GE',
  mn: 'mn_MN',
  lo: 'lo_LA',
  hy: 'hy_AM',
  lt: 'lt_LT',
  sq: 'sq_AL',
  sl: 'sl_SI',
  ti: 'ti_ET',
  lv: 'lv_LV',
  bs: 'bs_BA',
  rn: 'rn_BI',
};
