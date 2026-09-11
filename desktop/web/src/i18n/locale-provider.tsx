import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { IntlProvider, type IntlError } from "use-intl";

import { applyDocumentLanguage } from "../../../../src/i18n/document-language";
import { resolveDeviceLocale } from "../../../../src/i18n/device-locale";
import { MESSAGES } from "../../../../src/i18n/messages";
import { setClockLocale } from "@/lib/datetime";
import { setGeocodeLocale } from "@/lib/locate";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@i18n/locales";

const STORAGE_KEY = "lymark-web-locale";
const LEGACY_STORAGE_KEY = "lymark-mesa-locale";

type LocaleContextValue = {
  locale: Locale;
  isAutomatic: boolean;
  setLocale: (locale: Locale) => void;
  clearLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStored(): Locale | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw && isLocale(raw)) return raw;
  } catch {
    // storage bloqueado
  }
  return null;
}

function writeStored(value: string | null) {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage bloqueado
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [deviceLocale] = useState(resolveDeviceLocale);
  const [chosen, setChosen] = useState<Locale | null>(() => readStored());
  const locale = chosen ?? deviceLocale;

  // O relógio do carimbo e o geocode leem um módulo, não o contexto. Precisam
  // acompanhar o idioma ainda neste render — o efeito só pega o documento.
  setClockLocale(locale);
  setGeocodeLocale(locale);

  const setLocale = useCallback((next: Locale) => {
    setChosen(next);
    writeStored(next);
  }, []);

  const clearLocale = useCallback(() => {
    setChosen(null);
    writeStored(null);
  }, []);

  useEffect(() => {
    applyDocumentLanguage(document, locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, isAutomatic: chosen === null, setLocale, clearLocale }),
    [locale, chosen, setLocale, clearLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        messages={MESSAGES[locale]}
        onError={(error: IntlError) => console.warn("[i18n]", error.message)}
        getMessageFallback={({ namespace, key }: { namespace?: string; key: string }) => {
          const parts = [...(namespace ? namespace.split(".") : []), ...key.split(".")];
          let node: unknown = MESSAGES[DEFAULT_LOCALE];
          for (const part of parts) {
            if (!node || typeof node !== "object") return key;
            node = (node as Record<string, unknown>)[part];
          }
          return typeof node === "string" ? node : key;
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocalePreference(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocalePreference precisa estar dentro de <LocaleProvider>.");
  }
  return context;
}

export { DEFAULT_LOCALE };
