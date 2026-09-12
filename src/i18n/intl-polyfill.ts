/**
 * O pedaço de `Intl` que o Hermes não traz — e que o catálogo precisa.
 *
 * As mensagens com plural (`{count, plural, one {…} other {…}}`) passam pelo
 * `Intl.PluralRules`, e o motor JavaScript do Android (Hermes) não o
 * implementa. A formatação falhava em silêncio e o app mostrava a chave crua
 * — "plan.remaining", "gallery.count" — onde deveria estar "11 fotos grátis
 * restantes". As mensagens sem plural nunca passam por aí; por isso só essas
 * duas apareciam assim.
 *
 * Este arquivo entra ANTES do aplicativo (`index.js`). Cada polyfill só se
 * instala onde falta: na web e no iOS, que têm o nativo, nada muda. Os dados
 * de plural vêm num arquivo pequeno por idioma — 70 idiomas do
 * catálogo têm regra no CLDR via formatjs; rw, ht, rn, tg não têm e
 * recebem abaixo a regra "um / outros", que é como as mensagens deles
 * foram escritas.
 *
 * Derivado de `i18n/locales.ts`: ao acrescentar idioma, acrescentar aqui o
 * dado dele (o teste de paridade não cobre isto).
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';

import '@formatjs/intl-pluralrules/locale-data/am.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/az.js';
import '@formatjs/intl-pluralrules/locale-data/be.js';
import '@formatjs/intl-pluralrules/locale-data/bg.js';
import '@formatjs/intl-pluralrules/locale-data/bn.js';
import '@formatjs/intl-pluralrules/locale-data/bs.js';
import '@formatjs/intl-pluralrules/locale-data/ca.js';
import '@formatjs/intl-pluralrules/locale-data/cs.js';
import '@formatjs/intl-pluralrules/locale-data/da.js';
import '@formatjs/intl-pluralrules/locale-data/de.js';
import '@formatjs/intl-pluralrules/locale-data/dv.js';
import '@formatjs/intl-pluralrules/locale-data/dz.js';
import '@formatjs/intl-pluralrules/locale-data/el.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/et.js';
import '@formatjs/intl-pluralrules/locale-data/fa.js';
import '@formatjs/intl-pluralrules/locale-data/fi.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-pluralrules/locale-data/he.js';
import '@formatjs/intl-pluralrules/locale-data/hi.js';
import '@formatjs/intl-pluralrules/locale-data/hr.js';
import '@formatjs/intl-pluralrules/locale-data/hu.js';
import '@formatjs/intl-pluralrules/locale-data/hy.js';
import '@formatjs/intl-pluralrules/locale-data/id.js';
import '@formatjs/intl-pluralrules/locale-data/is.js';
import '@formatjs/intl-pluralrules/locale-data/it.js';
import '@formatjs/intl-pluralrules/locale-data/ja.js';
import '@formatjs/intl-pluralrules/locale-data/ka.js';
import '@formatjs/intl-pluralrules/locale-data/kk.js';
import '@formatjs/intl-pluralrules/locale-data/km.js';
import '@formatjs/intl-pluralrules/locale-data/ko.js';
import '@formatjs/intl-pluralrules/locale-data/ky.js';
import '@formatjs/intl-pluralrules/locale-data/lb.js';
import '@formatjs/intl-pluralrules/locale-data/lo.js';
import '@formatjs/intl-pluralrules/locale-data/lt.js';
import '@formatjs/intl-pluralrules/locale-data/lv.js';
import '@formatjs/intl-pluralrules/locale-data/mg.js';
import '@formatjs/intl-pluralrules/locale-data/mk.js';
import '@formatjs/intl-pluralrules/locale-data/mn.js';
import '@formatjs/intl-pluralrules/locale-data/ms.js';
import '@formatjs/intl-pluralrules/locale-data/mt.js';
import '@formatjs/intl-pluralrules/locale-data/my.js';
import '@formatjs/intl-pluralrules/locale-data/ne.js';
import '@formatjs/intl-pluralrules/locale-data/nl.js';
import '@formatjs/intl-pluralrules/locale-data/nn.js';
import '@formatjs/intl-pluralrules/locale-data/pl.js';
import '@formatjs/intl-pluralrules/locale-data/ps.js';
import '@formatjs/intl-pluralrules/locale-data/pt.js';
import '@formatjs/intl-pluralrules/locale-data/pt-PT.js';
import '@formatjs/intl-pluralrules/locale-data/ro.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';
import '@formatjs/intl-pluralrules/locale-data/si.js';
import '@formatjs/intl-pluralrules/locale-data/sk.js';
import '@formatjs/intl-pluralrules/locale-data/sl.js';
import '@formatjs/intl-pluralrules/locale-data/so.js';
import '@formatjs/intl-pluralrules/locale-data/sq.js';
import '@formatjs/intl-pluralrules/locale-data/sr.js';
import '@formatjs/intl-pluralrules/locale-data/sv.js';
import '@formatjs/intl-pluralrules/locale-data/sw.js';
import '@formatjs/intl-pluralrules/locale-data/th.js';
import '@formatjs/intl-pluralrules/locale-data/ti.js';
import '@formatjs/intl-pluralrules/locale-data/tk.js';
import '@formatjs/intl-pluralrules/locale-data/tr.js';
import '@formatjs/intl-pluralrules/locale-data/uk.js';
import '@formatjs/intl-pluralrules/locale-data/ur.js';
import '@formatjs/intl-pluralrules/locale-data/uz.js';
import '@formatjs/intl-pluralrules/locale-data/vi.js';
import '@formatjs/intl-pluralrules/locale-data/zh.js';

type PluralRulesWithData = typeof Intl.PluralRules & {
  __addLocaleData?: (data: { data: unknown; locale: string }) => void;
};

/** Idiomas sem regra de plural no CLDR: "um" para 1, "outros" para o resto. */
const ONE_OTHER = {
  categories: { cardinal: ['one', 'other'], ordinal: ['other'] },
  fn: (value: number | string) => (Number(value) === 1 ? 'one' : 'other'),
};

// Só existe no polyfill; onde o `Intl.PluralRules` é nativo, não há o que
// registrar (e o nativo já conhece esses idiomas ou cai em "other").
const pluralRules = Intl.PluralRules as PluralRulesWithData;
if (typeof pluralRules.__addLocaleData === 'function') {
  for (const locale of ['rw', 'ht', 'rn', 'tg']) {
    pluralRules.__addLocaleData({ data: ONE_OTHER, locale });
  }
}
