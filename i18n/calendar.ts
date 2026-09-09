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
  hi: ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  bn: ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ্ট', 'অক্ট', 'নভে', 'ডিসে'],
  ur: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  vi: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
  ro: ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'],
  uk: ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'],
  el: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'],
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  fa: ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'],
  // Cirílico sérvio — Roboto Condensed cobre; UI também em cirílico (NLLB srp_Cyrl).
  sr: ['јан', 'феб', 'мар', 'апр', 'мај', 'јун', 'јул', 'авг', 'сеп', 'окт', 'нов', 'дец'],
  am: ['ጃንዩ', 'ፌብሩ', 'ማርች', 'ኤፕሪ', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስ', 'ሴፕቴ', 'ኦክቶ', 'ኖቬም', 'ዲሴም'],
  cs: ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'],
  he: ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יונ׳', 'יול׳', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'],
  my: ['ဇန်', 'ဖေဖ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'ဩဂုတ်', 'စက်', 'အောက်', 'နိုဝင်', 'ဒီဇင်'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ne: ['जन', 'फेब', 'मार्च', 'अप्र', 'मे', 'जुन', 'जुल', 'अग', 'सेप', 'अक्ट', 'नोभ', 'डिसे'],
  hu: ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'],
  kk: ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'],
  ps: ['جنوري', 'فبروري', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  so: ['Jan', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Lul', 'Ogs', 'Seb', 'Okt', 'Nof', 'Dis'],
  sv: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
  az: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'],
  mg: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'],
  si: ['ජන', 'පෙබ', 'මාර්', 'අප්‍රේ', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'],
  km: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'],
  rw: ['Mut', 'Gas', 'Wer', 'Mat', 'Gic', 'Kam', 'Nya', 'Kan', 'Nze', 'Ukw', 'Ugu', 'Uku'],
  ht: ['jan', 'fev', 'mar', 'avr', 'me', 'jen', 'jiy', 'out', 'sep', 'okt', 'nov', 'des'],
  bg: ['ян.', 'февр.', 'март', 'апр.', 'май', 'юни', 'юли', 'авг.', 'септ.', 'окт.', 'ноем.', 'дек.'],
  da: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
  fi: ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'],
  sk: ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'],
  hr: ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'],
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
  mn: ['1-р', '2-р', '3-р', '4-р', '5-р', '6-р', '7-р', '8-р', '9-р', '10-р', '11-р', '12-р'],
  lo: ['ມ.ກ.', 'ກ.ພ.', 'ມ.ນ.', 'ມ.ສ.', 'ພ.ພ.', 'ມ.ຖ.', 'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.'],
  hy: ['հուն', 'փետ', 'մար', 'ապր', 'մայ', 'հուն', 'հուլ', 'օգս', 'սեպ', 'հոկ', 'նոյ', 'դեկ'],
  lt: ['sau', 'vas', 'kov', 'bal', 'geg', 'bir', 'lie', 'rgp', 'rgs', 'spa', 'lap', 'grd'],
  sq: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'],
  sl: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'avg.', 'sep.', 'okt.', 'nov.', 'dec.'],
  ti: ['ጃንዩ', 'ፌብሩ', 'ማርች', 'ኤፕሪ', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስ', 'ሴፕቴ', 'ኦክቶ', 'ኖቬም', 'ዲሴም'],
  lv: ['janv.', 'febr.', 'marts', 'apr.', 'maijs', 'jūn.', 'jūl.', 'aug.', 'sept.', 'okt.', 'nov.', 'dec.'],
  bs: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  rn: ['Mut', 'Gas', 'Wer', 'Mat', 'Gic', 'Kam', 'Nya', 'Kan', 'Nze', 'Ukw', 'Ugu', 'Uku'],
  et: ['jaan', 'veebr', 'märts', 'apr', 'mai', 'juuni', 'juuli', 'aug', 'sept', 'okt', 'nov', 'dets'],
  tg: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  mk: ['јан', 'фев', 'мар', 'апр', 'мај', 'јун', 'јул', 'авг', 'сеп', 'окт', 'ное', 'дек'],
  be: ['студз', 'лют', 'сак', 'крас', 'май', 'чэрв', 'ліп', 'жн', 'вер', 'кастр', 'ліст', 'снеж'],
  tk: ['ýan', 'few', 'mart', 'apr', 'maý', 'iýun', 'iýul', 'awg', 'sen', 'okt', 'noý', 'dek'],
  ky: ['янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ной.', 'дек.'],
  nn: ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'],
  lb: ['Jan.', 'Feb.', 'Mäe.', 'Abr.', 'Mee', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  dz: ['ཟླ་༡', 'ཟླ་༢', 'ཟླ་༣', 'ཟླ་༤', 'ཟླ་༥', 'ཟླ་༦', 'ཟླ་༧', 'ཟླ་༨', 'ཟླ་༩', 'ཟླ་༡༠', 'ཟླ་༡༡', 'ཟླ་༡༢'],
  mt: ['Jan', 'Fra', 'Mar', 'Apr', 'Mej', 'Ġun', 'Lul', 'Aww', 'Set', 'Ott', 'Nov', 'Diċ'],
  is: ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'],
  dv: ['ޖަނަވަރީ', 'ފެބްރުއަރީ', 'މާރޗް', 'އޭޕްރީލް', 'މެއި', 'ޖޫން', 'ޖުލައި', 'އޮގަސްޓް', 'ސެޕްޓެމްބަރ', 'އޮކްޓޫބަރ', 'ނޮވެމްބަރ', 'ޑިސެމްބަރ'],
  ca: ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'],
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
/*
 * Pendência do dia com dois dígitos em chinês, japonês e coreano.
 *
 * `formatDate` preenche `{d}` com dois dígitos em todo idioma, porque o bloco
 * do carimbo tem largura fixa. Nestes três, isso produz "2026年8月01日" — que
 * nenhum japonês escreve; a forma é "8月1日". O mês, aliás, já sai sem o zero,
 * então o molde hoje é internamente inconsistente.
 *
 * Não corrigi agora de propósito: `STAMP_LOCALE` manda estes três para o
 * inglês por falta de fonte, então nenhuma foto sai com esta data. Quando a
 * fonte CJK entrar, isto precisa entrar junto — provavelmente como uma
 * marcação de "não preencher com zero" por idioma, e não como exceção
 * espalhada pelo formatador.
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
  hi: '{d} {mon} {y}',
  sw: '{d} {mon} {y}',
  id: '{d} {mon} {y}',
  ms: '{d} {mon} {y}',
  bn: '{d} {mon} {y}',
  ur: '{d} {mon} {y}',
  tr: '{d} {mon} {y}',
  vi: '{d} {mon} {y}',
  ro: '{d} {mon} {y}',
  uk: '{d} {mon} {y}',
  el: '{d} {mon} {y}',
  pl: '{d} {mon} {y}',
  th: '{d} {mon} {y}',
  fa: '{d} {mon} {y}',
  sr: '{d}. {mon} {y}.',
  am: '{d} {mon} {y}',
  cs: '{d}. {mon} {y}',
  he: '{d} {mon} {y}',
  my: '{d} {mon} {y}',
  uz: '{d} {mon} {y}',
  ne: '{d} {mon} {y}',
  hu: '{d}. {mon} {y}.',
  kk: '{d} {mon} {y}',
  ps: '{d} {mon} {y}',
  so: '{d} {mon} {y}',
  sv: '{d} {mon} {y}',
  az: '{d} {mon} {y}',
  mg: '{d} {mon} {y}',
  si: '{d} {mon} {y}',
  km: '{d} {mon} {y}',
  rw: '{d} {mon} {y}',
  ht: '{d} {mon} {y}',
  bg: '{d} {mon} {y}',
  da: '{d}. {mon} {y}',
  fi: '{d}. {mon} {y}',
  sk: '{d}. {mon} {y}',
  hr: '{d}. {mon} {y}.',
  ka: '{d} {mon} {y}',
  mn: '{y} оны {mon} сарын {d}',
  lo: '{d} {mon} {y}',
  hy: '{d} {mon} {y}',
  lt: '{d} {mon} {y}',
  sq: '{d} {mon} {y}',
  sl: '{d}. {mon} {y}',
  ti: '{d} {mon} {y}',
  lv: '{d}. {mon} {y}.',
  bs: '{d}. {mon} {y}.',
  rn: '{d} {mon} {y}',
  et: '{d}. {mon} {y}',
  tg: '{d} {mon} {y}',
  mk: '{d}. {mon} {y}',
  be: '{d} {mon} {y}',
  tk: '{d} {mon} {y}',
  ky: '{d} {mon} {y}',
  nn: '{d}. {mon} {y}',
  lb: '{d}. {mon} {y}',
  dz: '{d} {mon} {y}',
  mt: '{d} {mon} {y}',
  is: '{d}. {mon} {y}',
  dv: '{d} {mon} {y}',
  ca: '{d} {mon} {y}',
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
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  sw: ['Jp', 'Jt', 'Jn', 'Tt', 'Al', 'Ij', 'Jm'],
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  ro: ['dum', 'lun', 'mar', 'mie', 'joi', 'vin', 'sâm'],
  uk: ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  el: ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'],
  pl: ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'],
  th: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  sr: ['нед', 'пон', 'уто', 'сре', 'чет', 'пет', 'суб'],
  am: ['እሁድ', 'ሰኞ', 'ማክሰ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
  cs: ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'],
  he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  my: ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'],
  uz: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'],
  ne: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'],
  hu: ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'],
  kk: ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'],
  ps: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  so: ['Axd', 'Isn', 'Tal', 'Arb', 'Kha', 'Jim', 'Sab'],
  sv: ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'],
  az: ['B.', 'B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.'],
  mg: ['Alah', 'Alats', 'Tal', 'Alar', 'Alak', 'Zom', 'Asab'],
  si: ['ඉරි', 'සඳු', 'අඟ', 'බදා', 'බ්‍රහ', 'සිකු', 'සෙන'],
  km: ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'],
  rw: ['Cyu', 'Mbe', 'Kab', 'Gat', 'Kan', 'Gtn', 'Nku'],
  ht: ['dim', 'len', 'mad', 'mèk', 'jed', 'van', 'sam'],
  bg: ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  da: ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'],
  fi: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],
  sk: ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'],
  hr: ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'],
  ka: ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'],
  mn: ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'],
  lo: ['ອາ', 'ຈ', 'ອ', 'ພ', 'ພຫ', 'ສຸ', 'ສ'],
  hy: ['կիր', 'երկ', 'երք', 'չոր', 'հին', 'ուրբ', 'շաբ'],
  lt: ['sk', 'pr', 'an', 'tr', 'kt', 'pn', 'št'],
  sq: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'],
  sl: ['ned.', 'pon.', 'tor.', 'sre.', 'čet.', 'pet.', 'sob.'],
  ti: ['ሰንበ', 'ሰኑይ', 'ሰሉስ', 'ረቡዕ', 'ሓሙስ', 'ዓርቢ', 'ቀዳም'],
  lv: ['sv', 'pr', 'ot', 'tr', 'ce', 'pk', 'se'],
  bs: ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'],
  rn: ['cu', 'mbe', 'kab', 'gtu', 'kan', 'gnu', 'gnd'],
  et: ['P', 'E', 'T', 'K', 'N', 'R', 'L'],
  tg: ['якш', 'душ', 'сеш', 'чор', 'пан', 'ҷум', 'шан'],
  mk: ['нед', 'пон', 'вто', 'сре', 'чет', 'пет', 'саб'],
  be: ['нд', 'пн', 'аў', 'ср', 'чц', 'пт', 'сб'],
  tk: ['Ýek', 'Duş', 'Siş', 'Çar', 'Pen', 'Anna', 'Şen'],
  ky: ['жек', 'дүй', 'шей', 'шар', 'бей', 'жум', 'ише'],
  nn: ['sø.', 'må.', 'ty.', 'on.', 'to.', 'fr.', 'la.'],
  lb: ['So.', 'Mé.', 'Dë.', 'Më.', 'Do.', 'Fr.', 'Sa.'],
  dz: ['ཉི་', 'ཟླ་', 'མིར་', 'ལྷག་', 'ཕུར་', 'སངས་', 'སྤེན་'],
  mt: ['Ħad', 'Tne', 'Tli', 'Erb', 'Ħam', 'Ġim', 'Sib'],
  is: ['sun.', 'mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.'],
  dv: ['އާދީއްތަ', 'ހޯމަ', 'އަންގާރަ', 'ބުދަ', 'ބުރާސްފަތި', 'ހުކުރު', 'ހޮނިހިރު'],
  ca: ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'],
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
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  sw: ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'],
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  vi: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  ro: ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'],
  uk: ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота'],
  el: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
  pl: ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'],
  th: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
  fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  sr: ['недеља', 'понедељак', 'уторак', 'среда', 'четвртак', 'петак', 'субота'],
  am: ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
  cs: ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'],
  he: ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'],
  my: ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'],
  uz: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  ne: ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'],
  hu: ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'],
  kk: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
  ps: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
  so: ['Axad', 'Isniin', 'Talaado', 'Arbaco', 'Khamiis', 'Jimco', 'Sabti'],
  sv: ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'],
  az: ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə'],
  mg: ['Alahady', 'Alatsinainy', 'Talata', 'Alarobia', 'Alakamisy', 'Zoma', 'Asabotsy'],
  si: ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'],
  km: ['ថ្ងៃអាទិត្យ', 'ថ្ងៃច័ន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'],
  rw: ['Ku cyumweru', 'Ku wa mbere', 'Ku wa kabiri', 'Ku wa gatatu', 'Ku wa kane', 'Ku wa gatanu', 'Ku wa gatandatu'],
  ht: ['dimanch', 'lendi', 'madi', 'mèkredi', 'jedi', 'vandredi', 'samdi'],
  bg: ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'],
  da: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
  fi: ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'],
  sk: ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'],
  hr: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
  ka: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
  mn: ['ням', 'даваа', 'мягмар', 'лхагва', 'пүрэв', 'баасан', 'бямба'],
  lo: ['ວັນອາທິດ', 'ວັນຈັນ', 'ວັນອັງຄານ', 'ວັນພຸດ', 'ວັນພະຫັດ', 'ວັນສຸກ', 'ວັນເສົາ'],
  hy: ['կիրակի', 'երկուշաբթի', 'երեքշաբթի', 'չորեքշաբթի', 'հինգշաբթի', 'ուրբաթ', 'շաբաթ'],
  lt: ['sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis', 'ketvirtadienis', 'penktadienis', 'šeštadienis'],
  sq: ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'],
  sl: ['nedelja', 'ponedeljek', 'torek', 'sreda', 'četrtek', 'petek', 'sobota'],
  ti: ['ሰንበት', 'ሰኑይ', 'ሰሉስ', 'ረቡዕ', 'ሓሙስ', 'ዓርቢ', 'ቀዳም'],
  lv: ['svētdiena', 'pirmdiena', 'otrdiena', 'trešdiena', 'ceturtdiena', 'piektdiena', 'sestdiena'],
  bs: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
  rn: ['Ku yumvire', 'Ku wa mbere', 'Ku wa kabiri', 'Ku wa gatatu', 'Ku wa kane', 'Ku wa gatanu', 'Ku wa gatandatu'],
  et: ['pühapäev', 'esmaspäev', 'teisipäev', 'kolmapäev', 'neljapäev', 'reede', 'laupäev'],
  tg: ['якшанбе', 'душанбе', 'сешанбе', 'чоршанбе', 'панҷшанбе', 'ҷумъа', 'шанбе'],
  mk: ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'],
  be: ['нядзеля', 'панядзелак', 'аўторак', 'серада', 'чацвер', 'пятніца', 'субота'],
  tk: ['Ýekşenbe', 'Duşenbe', 'Sişenbe', 'Çarşenbe', 'Penşenbe', 'Anna', 'Şenbe'],
  ky: ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'],
  nn: ['søndag', 'måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag'],
  lb: ['Sonndeg', 'Méindeg', 'Dënschdeg', 'Mëttwoch', 'Donneschdeg', 'Freideg', 'Samschdeg'],
  dz: ['ཉི་མ་', 'ཟླ་བ་', 'མིག་དམར་', 'ལྷག་པ་', 'ཕུར་བུ་', 'པ་སངས་', 'སྤེན་པ་'],
  mt: ['Il-Ħadd', 'It-Tnejn', 'It-Tlieta', 'L-Erbgħa', 'Il-Ħamis', 'Il-Ġimgħa', 'Is-Sibt'],
  is: ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'],
  dv: ['އާދީއްތަ', 'ހޯމަ', 'އަންގާރަ', 'ބުދަ', 'ބުރާސްފަތި', 'ހުކުރު', 'ހޮނިހިރު'],
  ca: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
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
 * O carimbo desenha com `canvas.drawText` sobre um typeface único, sem cadeia
 * de fontes de reserva: um caractere que a fonte não tem vira `.notdef`, o
 * quadradinho vazio. Numa foto de comprovação isso é pior que idioma trocado,
 * porque o documento fica ilegível e parece defeito. Então, onde falta
 * alfabeto, o carimbo cai para o inglês — mesmo alfabeto do português, e o
 * que mais gente lê.
 *
 * O que está embarcado hoje:
 *
 * - **Barlow** e **Pathway Gothic One** — latim e latim estendido.
 * - **Roboto Condensed** — cirílico e grego, escolhida por medição contra a
 *   Barlow (2,9% de diferença média) para que a troca não mude o desenho do
 *   bloco.
 *
 * Falta árabe, hebraico, CJK, tailandês, índico, persa, urdu e amárico. O
 * árabe é o caso mais distante: não basta ter os glifos, porque `drawText`
 * mapeia caractere a caractere e a escrita árabe exige *shaping* — as letras
 * mudam de forma conforme a posição na palavra. Resolver aquilo significa
 * trocar para a API `Paragraph` e refazer a linha de base do harness de
 * fidelidade.
 *
 * **Isto é uma limitação de fonte, não de tradução.** A interface continua no
 * idioma escolhido; só a data impressa na imagem muda. O endereço é caso à
 * parte: vem do geocodificador no alfabeto do país onde a foto foi tirada, e
 * por isso a escolha da fonte olha o conteúdo (`scriptFor`), não este mapa.
 */
export const STAMP_LOCALE: Record<Locale, Locale> = {
  pt: 'pt',
  en: 'en',
  es: 'es',
  fr: 'fr',
  it: 'it',
  de: 'de',
  nl: 'nl',
  // Cirílico: coberto pela Roboto Condensed.
  ru: 'ru',
  // Árabe e CJK: sem glifos nas fontes do carimbo.
  zh: 'en',
  ja: 'en',
  ko: 'en',
  ar: 'en',
  // Fase 1 — latim / latim estendido / cirílico / grego: desenha.
  hi: 'en',
  sw: 'sw',
  id: 'id',
  ms: 'ms',
  bn: 'en',
  ur: 'en',
  tr: 'tr',
  vi: 'vi',
  ro: 'ro',
  uk: 'uk',
  el: 'el',
  pl: 'pl',
  th: 'en',
  fa: 'en',
  sr: 'sr',
  am: 'en',
  cs: 'cs',
  he: 'en',
  // Fase 2 — latim / latim estendido / cirílico: desenha; demais scripts: inglês.
  my: 'en',
  uz: 'uz',
  ne: 'en',
  hu: 'hu',
  kk: 'kk',
  ps: 'en',
  so: 'so',
  sv: 'sv',
  az: 'az',
  mg: 'mg',
  si: 'en',
  km: 'en',
  rw: 'rw',
  ht: 'ht',
  bg: 'bg',
  // Fase 3 — latim / cirílico: desenha; georgiano, lao, armênio, tigrínia: inglês.
  da: 'da',
  fi: 'fi',
  sk: 'sk',
  hr: 'hr',
  ka: 'en',
  mn: 'mn',
  lo: 'en',
  hy: 'en',
  lt: 'lt',
  sq: 'sq',
  sl: 'sl',
  ti: 'en',
  lv: 'lv',
  bs: 'bs',
  rn: 'rn',
  // Fase 4 — latim / cirílico: desenha; tibetano (dz) e thaana (dv): inglês.
  et: 'et',
  tg: 'tg',
  mk: 'mk',
  be: 'be',
  tk: 'tk',
  ky: 'ky',
  nn: 'nn',
  lb: 'lb',
  dz: 'en',
  mt: 'mt',
  is: 'is',
  dv: 'en',
  ca: 'ca',
};

/** `true` quando o carimbo consegue desenhar o idioma da interface. */
export function stampCanDraw(locale: Locale): boolean {
  return STAMP_LOCALE[locale] === locale;
}
