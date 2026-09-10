export type ClockFields = {
  time: string;
  date: string;
  weekday: string;
};

export function clockFromDate(d: Date, locale = "pt-BR"): ClockFields {
  return {
    time: d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    date: d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    weekday: d.toLocaleDateString(locale, { weekday: "short" }).replace(/\.$/, ""),
  };
}

export function clockNow(locale = "pt-BR"): ClockFields {
  return clockFromDate(new Date(), locale);
}

export function fileStampName(code: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `lymark-${y}${m}${day}-${code}.jpg`;
}
