import {
  DATE_PATTERN,
  MONTHS,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
} from '@i18n/calendar';
import { DEFAULT_LOCALE, type Locale } from '@i18n/locales';

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
 * `11:04` — sempre em 24 horas.
 *
 * O porquê está em `i18n/calendar.ts`: leitura única vale mais que hábito
 * local num carimbo que serve de comprovação.
 */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
