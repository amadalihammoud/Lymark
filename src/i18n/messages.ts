import am from '@i18n/messages/am.json';
import ar from '@i18n/messages/ar.json';
import az from '@i18n/messages/az.json';
import bg from '@i18n/messages/bg.json';
import bn from '@i18n/messages/bn.json';
import cs from '@i18n/messages/cs.json';
import de from '@i18n/messages/de.json';
import el from '@i18n/messages/el.json';
import en from '@i18n/messages/en.json';
import es from '@i18n/messages/es.json';
import fa from '@i18n/messages/fa.json';
import fr from '@i18n/messages/fr.json';
import he from '@i18n/messages/he.json';
import hi from '@i18n/messages/hi.json';
import ht from '@i18n/messages/ht.json';
import hu from '@i18n/messages/hu.json';
import id from '@i18n/messages/id.json';
import it from '@i18n/messages/it.json';
import ja from '@i18n/messages/ja.json';
import kk from '@i18n/messages/kk.json';
import km from '@i18n/messages/km.json';
import ko from '@i18n/messages/ko.json';
import mg from '@i18n/messages/mg.json';
import ms from '@i18n/messages/ms.json';
import my from '@i18n/messages/my.json';
import ne from '@i18n/messages/ne.json';
import nl from '@i18n/messages/nl.json';
import pl from '@i18n/messages/pl.json';
import ps from '@i18n/messages/ps.json';
import pt from '@i18n/messages/pt.json';
import ro from '@i18n/messages/ro.json';
import ru from '@i18n/messages/ru.json';
import rw from '@i18n/messages/rw.json';
import si from '@i18n/messages/si.json';
import so from '@i18n/messages/so.json';
import sr from '@i18n/messages/sr.json';
import sv from '@i18n/messages/sv.json';
import sw from '@i18n/messages/sw.json';
import th from '@i18n/messages/th.json';
import tr from '@i18n/messages/tr.json';
import uk from '@i18n/messages/uk.json';
import ur from '@i18n/messages/ur.json';
import uz from '@i18n/messages/uz.json';
import vi from '@i18n/messages/vi.json';
import zh from '@i18n/messages/zh.json';

import type { Locale } from '@i18n/locales';

/**
 * Os catálogos, todos embarcados no pacote.
 *
 * Carregar sob demanda economizaria cerca de noventa quilobytes, e custaria a
 * coisa errada: o Lymark é usado em telhado, em galpão, em obra — lugares sem
 * sinal. Um idioma que só chega pela rede é um idioma que falta exatamente
 * quando a pessoa precisa dele.
 *
 * Os `import` são estáticos de propósito: o empacotador do Expo resolve
 * caminho literal em tempo de build, e um `require` montado com variável
 * ficaria de fora do pacote.
 */
export const MESSAGES = {
  pt,
  en,
  es,
  fr,
  it,
  de,
  nl,
  ru,
  zh,
  ja,
  ko,
  ar,
  hi,
  sw,
  id,
  ms,
  bn,
  ur,
  tr,
  vi,
  ro,
  uk,
  el,
  pl,
  th,
  fa,
  sr,
  am,
  cs,
  he,
  my,
  uz,
  ne,
  hu,
  kk,
  ps,
  so,
  sv,
  az,
  mg,
  si,
  km,
  rw,
  ht,
  bg,
} as const;

export type Messages = (typeof MESSAGES)[Locale];
