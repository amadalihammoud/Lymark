import type { Locale } from './locales';

/**
 * Meses e dias da semana, por idioma — as tabelas que o carimbo imprime.
 *
 * Ficam aqui, e não em `messages/`, porque não são texto de interface: são
 * dados de formatação, consumidos pelo aplicativo, pelo site e pelo desktop
 * do mesmo jeito. O catálogo guarda o que a pessoa lê numa tela; isto guarda
 * o que vai impresso na foto.
 *
 * **Por que tabelas fixas e não `Intl`.** O formato impresso na foto é parte
 * do produto: dois aparelhos diferentes precisam carimbar exatamente igual, e
 * o `Intl` varia com a versão do sistema e com o ICU embarcado em cada build.
 * A tabela garante que "12 ago. 2026" seja "12 ago. 2026" em qualquer lugar,
 * hoje e daqui a três anos — o que importa quando a foto é comprovação.
 */

/** Os doze meses, já com a pontuação que cada idioma usa na abreviação. */
export const MONTHS: Record<Locale, readonly string[]> = {
  pt: ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
  // O francês é irregular de propósito: "mars", "mai", "juin" e "août" não se
  // abreviam, e os demais levam ponto. Por isso o token guarda a própria
  // pontuação em vez de o padrão acrescentá-la.
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
  nl: ['jan.', 'feb.', 'mrt.', 'apr.', 'mei', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  // Chinês, japonês e coreano escrevem o mês como número, e o marcador vem do
  // padrão da data — "8月", "8월". Abreviação de nome de mês não existe.
  zh: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  ja: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  ko: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/**
 * A ordem da data, por idioma.
 *
 * `{d}` é o dia com dois dígitos, `{mon}` o token do mês, `{y}` o ano.
 *
 * A ordem muda onde a língua manda: o japonês escreve 2026年8月12日, e inverter
 * isso para caber num molde ocidental produziria uma data que ninguém escreve.
 * Nos demais idiomas a ordem é dia-mês-ano com o mês por extenso — e o mês por
 * extenso é o que evita a ambiguidade entre 01/02 e 02/01, que num documento de
 * vistoria não é detalhe.
 */
export const DATE_PATTERN: Record<Locale, string> = {
  pt: '{d} {mon} {y}',
  en: '{d} {mon} {y}',
  es: '{d} {mon} {y}',
  fr: '{d} {mon} {y}',
  it: '{d} {mon} {y}',
  // O alemão põe ponto depois do dia: "12. Aug. 2026".
  de: '{d}. {mon} {y}',
  nl: '{d} {mon} {y}',
  ru: '{d} {mon} {y}',
  zh: '{y}年{mon}月{d}日',
  ja: '{y}年{mon}月{d}日',
  ko: '{y}년 {mon}월 {d}일',
  ar: '{d} {mon} {y}',
};

/** Abreviação do dia da semana — o que cabe no carimbo, abaixo da data. */
export const WEEKDAYS_SHORT: Record<Locale, readonly string[]> = {
  pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  it: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  nl: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  ar: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
};

/** Nome completo — usado onde há espaço, como no detalhe da galeria. */
export const WEEKDAYS_LONG: Record<Locale, readonly string[]> = {
  pt: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  it: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  nl: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  ko: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

/**
 * A hora é 24 horas em todos os idiomas, inclusive em inglês.
 *
 * Não é descuido. "07:42" não tem como ser lido de duas formas; "7:42" sem
 * AM/PM tem, e com AM/PM ocupa mais espaço sobre a foto. Num carimbo que
 * serve de comprovação, a leitura única vale mais que o hábito local — é a
 * mesma razão pela qual laudo, aviação e emergência usam 24 horas em toda
 * parte.
 */
export const USES_24_HOUR = true;

/**
 * O idioma que o **carimbo** consegue desenhar, para cada idioma da interface.
 *
 * As duas fontes embarcadas — Barlow e Pathway Gothic One — cobrem latim e
 * latim estendido, e mais nada. Verifiquei o `cmap` das duas: não há um único
 * glifo cirílico, árabe, grego ou CJK. E o carimbo desenha com
 * `canvas.drawText` sobre um typeface único, sem cadeia de reserva — um
 * caractere ausente vira `.notdef`, o quadradinho vazio.
 *
 * Numa foto de comprovação, quadradinho vazio é pior que idioma trocado: o
 * documento fica ilegível e parece defeito. Então, enquanto não houver fonte
 * para o alfabeto, o carimbo cai para o inglês — que usa o mesmo alfabeto do
 * português e é o que mais gente lê.
 *
 * **Isto é uma limitação de fonte, não de tradução.** A interface continua no
 * idioma escolhido; só a data impressa na imagem muda. E o endereço, que vem
 * do geocodificador no alfabeto local, continua sem solução por aqui — ver a
 * pendência registrada em `docs/`.
 */
export const STAMP_LOCALE: Record<Locale, Locale> = {
  pt: 'pt',
  en: 'en',
  es: 'es',
  fr: 'fr',
  it: 'it',
  de: 'de',
  nl: 'nl',
  // Cirílico, árabe e CJK: sem glifos nas fontes do carimbo.
  ru: 'en',
  zh: 'en',
  ja: 'en',
  ko: 'en',
  ar: 'en',
};

/** `true` quando o carimbo consegue desenhar o idioma da interface. */
export function stampCanDraw(locale: Locale): boolean {
  return STAMP_LOCALE[locale] === locale;
}
