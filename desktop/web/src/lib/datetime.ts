import {
  DATE_PATTERN,
  MONTHS,
  WEEKDAYS_SHORT,
} from "../../../../i18n/calendar.ts";
import { DEFAULT_LOCALE, type Locale } from "../../../../i18n/locales.ts";

export type ClockFields = {
  time: string;
  date: string;
  weekday: string;
};

let clockLocale: Locale = DEFAULT_LOCALE;

export function setClockLocale(locale: Locale) {
  clockLocale = locale;
}

export function getClockLocale(): Locale {
  return clockLocale;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(date: Date, locale: Locale = clockLocale): string {
  return DATE_PATTERN[locale]
    .replace("{d}", pad(date.getDate()))
    .replace("{mon}", MONTHS[locale][date.getMonth()] ?? "")
    .replace("{y}", String(date.getFullYear()));
}

export function formatWeekday(date: Date, locale: Locale = clockLocale): string {
  return WEEKDAYS_SHORT[locale][date.getDay()] ?? "";
}

export function clockFromDate(d: Date, locale: Locale = clockLocale): ClockFields {
  return {
    time: formatTime(d),
    date: formatDate(d, locale),
    weekday: formatWeekday(d, locale),
  };
}

export function clockNow(locale: Locale = clockLocale): ClockFields {
  return clockFromDate(new Date(), locale);
}

export function fileStampName(code: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `lymark-${y}${m}${day}-${code}.jpg`;
}
