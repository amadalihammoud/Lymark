import ar from '@i18n/messages/ar.json';
import de from '@i18n/messages/de.json';
import en from '@i18n/messages/en.json';
import es from '@i18n/messages/es.json';
import fr from '@i18n/messages/fr.json';
import it from '@i18n/messages/it.json';
import ja from '@i18n/messages/ja.json';
import ko from '@i18n/messages/ko.json';
import nl from '@i18n/messages/nl.json';
import pt from '@i18n/messages/pt.json';
import ru from '@i18n/messages/ru.json';
import zh from '@i18n/messages/zh.json';

import type { Locale } from '@i18n/locales';

/**
 * Os doze catálogos, todos embarcados no pacote.
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
export const MESSAGES = { pt, en, es, fr, it, de, nl, ru, zh, ja, ko, ar } as const;

export type Messages = (typeof MESSAGES)[Locale];
