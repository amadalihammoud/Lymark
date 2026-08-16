import {
  DATE_PATTERN,
  MONTHS,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
} from '@i18n/calendar';
import { DEFAULT_LOCALE, type Locale } from '@i18n/locales';
import type { TimeFormat } from '@/types';

/**
 * Formatação de data e hora do carimbo.
 *
 * Deliberadamente sem `Intl`: o formato exibido na foto é parte do produto e
 * não pode variar conforme o aparelho — dois celulares diferentes precisam
 * carimbar exatamente igual, hoje e daqui a três anos. As tabelas fixas
 * vivem em `i18n/calendar.ts`, uma por idioma, e são compartilhadas com o
 * site e o desktop.
 *
 * O idioma entra por parâmetro, com o português como padrão. Isso mantém as
 * funções puras e testáveis nas doze línguas sem montar contexto de React —
 * e faz com que esquecer de passar o idioma degrade para o comportamento
 * antigo, em vez de quebrar.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * `11:04` em 24 horas, `2:30 PM` em 12.
 *
 * O formato vem por PREFERÊNCIA, nunca do aparelho — o porquê está em
 * `i18n/calendar.ts`: o carimbo serve de comprovação e não pode mudar de
 * cara porque o celular trocou de configuração. O padrão continua 24h.
 *
 * No 12h a hora sai sem zero à esquerda (como se escreve de fato), meia-noite
 * é `12:00 AM` e meio-dia `12:00 PM` — a convenção do relógio de 12 horas.
 */
export function formatTime(date: Date, format: TimeFormat = '24h'): string {
  if (format === '12h') {
    const hours = date.getHours();
    const suffix = hours < 12 ? 'AM' : 'PM';
    const clock = hours % 12 === 0 ? 12 : hours % 12;
    return `${clock}:${pad(date.getMinutes())} ${suffix}`;
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converte um horário escrito PELO APP entre 24h e 12h, preservando o valor.
 *
 * Existe por causa da ordem de hidratação: o rascunho de captura nasce antes
 * de as preferências chegarem do disco, e o campo pode já estar preenchido no
 * formato antigo quando a preferência (ou a troca dela) chega. Reescrever com
 * o relógio de AGORA mudaria a hora que a pessoa viu — converter preserva.
 *
 * Só converte o que tem exatamente a cara do que o app escreve; qualquer
 * outra coisa é texto da pessoa e devolve `null` — intocável, como sempre.
 */
export function convertTimeFormat(value: string, to: TimeFormat): string | null {
  const twentyFour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (twentyFour) {
    if (to === '24h') return value;
    const hours = Number(twentyFour[1]);
    const suffix = hours < 12 ? 'AM' : 'PM';
    const clock = hours % 12 === 0 ? 12 : hours % 12;
    return `${clock}:${twentyFour[2]} ${suffix}`;
  }

  const twelve = /^(1[0-2]|[1-9]):([0-5]\d) (AM|PM)$/.exec(value);
  if (twelve) {
    if (to === '12h') return value;
    const clock = Number(twelve[1]) % 12;
    const hours = twelve[3] === 'PM' ? clock + 12 : clock;
    return `${pad(hours)}:${twelve[2]}`;
  }

  return null;
}

/**
 * `12 ago. 2026` em português, `2026年8月12日` em japonês.
 *
 * O dia vai com dois dígitos porque o carimbo tem largura fixa e um dígito a
 * menos deslocaria o bloco inteiro. O mês e o ano seguem o que o idioma
 * escreve.
 */
export function formatDate(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return DATE_PATTERN[locale]
    .replace('{d}', pad(date.getDate()))
    .replace('{mon}', MONTHS[locale][date.getMonth()])
    .replace('{y}', String(date.getFullYear()));
}

/** `Sáb` */
export function formatWeekday(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return WEEKDAYS_SHORT[locale][date.getDay()];
}

/** `Sábado` — usado onde há espaço, como no detalhe da galeria. */
export function formatWeekdayFull(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return WEEKDAYS_LONG[locale][date.getDay()];
}

/** `01 ago. 2026 · 11:04` — carimbo curto para listas do histórico. */
export function formatTimestamp(isoDate: string, locale: Locale = DEFAULT_LOCALE): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date, locale)} · ${formatTime(date)}`;
}
