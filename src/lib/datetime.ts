/**
 * Formatação de data/hora em pt-BR.
 *
 * Deliberadamente sem `Intl`: o Hermes é compilado sem ICU completo em
 * algumas configurações de build, e o formato exibido na foto é parte do
 * produto — não pode variar conforme o aparelho. Tabelas fixas garantem
 * que "01 ago. 2026" seja "01 ago. 2026" em qualquer lugar.
 */

const MONTHS_ABBR = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const WEEKDAYS_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const WEEKDAYS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/** `11:04` */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `01 ago. 2026` */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())} ${MONTHS_ABBR[date.getMonth()]}. ${date.getFullYear()}`;
}

/** `Sáb` */
export function formatWeekday(date: Date): string {
  return WEEKDAYS_ABBR[date.getDay()];
}

/** `Sábado` — usado onde há espaço, como no detalhe da galeria. */
export function formatWeekdayFull(date: Date): string {
  return WEEKDAYS_FULL[date.getDay()];
}

/** `01 ago. 2026 · 11:04` — carimbo curto para listas do histórico. */
export function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)} · ${formatTime(date)}`;
}
