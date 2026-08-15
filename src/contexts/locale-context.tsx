import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { IntlProvider, type IntlError } from 'use-intl';

import { DEFAULT_LOCALE, isLocale, type Locale } from '@i18n/locales';
import { resolveDeviceLocale } from '@/i18n/device-locale';
import { MESSAGES } from '@/i18n/messages';
import { StorageKeys, readJson, writeJson } from '@/lib/storage';

/**
 * O idioma da interface.
 *
 * Três fontes, nesta ordem: o que a pessoa escolheu na tela de idioma, o que
 * o aparelho pede, e o português. A escolha explícita vence sempre — quem
 * trabalha num aparelho configurado em inglês e prefere ler em espanhol
 * escolheu isso de propósito, e trocar o idioma de volta a cada abertura
 * seria desfazer a decisão dela.
 *
 * O catálogo é o mesmo do site e do desktop, em `i18n/messages/`. O motor é o
 * `use-intl`, que é o núcleo do `next-intl` usado no site: mesma sintaxe de
 * mensagem, mesmo comportamento de plural e de gênero nas três plataformas.
 */

type LocaleContextValue = {
  locale: Locale;
  /** `false` enquanto o disco ainda não respondeu. */
  hydrated: boolean;
  /** `true` quando o idioma veio do aparelho, e não de uma escolha. */
  isAutomatic: boolean;
  setLocale: (locale: Locale) => void;
  /** Volta a seguir o idioma do aparelho. */
  clearLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type StoredLocale = { locale: string };

export function LocaleProvider({ children }: { children: ReactNode }) {
  // O idioma do aparelho é lido uma vez e serve de base enquanto o disco não
  // responde. Nada de piscar português para quem tem o aparelho em japonês.
  const [deviceLocale] = useState(resolveDeviceLocale);
  const [chosen, setChosen] = useState<Locale | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Mesma trava do contexto de preferências: leitura que falhou não é disco
   * vazio, e gravar depois dela apagaria a escolha do usuário por causa de
   * uma falha momentânea.
   */
  const [writable, setWritable] = useState(false);

  useEffect(() => {
    let active = true;

    void readJson<StoredLocale>(StorageKeys.locale)
      .then((result) => {
        if (!active) return;

        if (result.status === 'found' && isLocale(result.value.locale)) {
          setChosen(result.value.locale);
        }

        setWritable(result.status !== 'failed');
        setHydrated(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.warn('[locale] falha ao hidratar o idioma.', error);
        setWritable(false);
        setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setChosen(next);
      if (writable) void writeJson(StorageKeys.locale, { locale: next });
    },
    [writable],
  );

  const clearLocale = useCallback(() => {
    setChosen(null);
    if (writable) void writeJson(StorageKeys.locale, { locale: '' });
  }, [writable]);

  const locale = chosen ?? deviceLocale;

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, hydrated, isAutomatic: chosen === null, setLocale, clearLocale }),
    [locale, hydrated, chosen, setLocale, clearLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        messages={MESSAGES[locale]}
        // Uma chave faltando não pode derrubar a tela de captura no meio de
        // um serviço. Registra e segue com a chave à mostra, que é feio e
        // diagnosticável — ao contrário de uma tela branca.
        onError={(error: IntlError) => console.warn('[i18n]', error.message)}
        getMessageFallback={({ key }: { key: string }) => key}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocalePreference(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocalePreference precisa estar dentro de <LocaleProvider>.');
  }
  return context;
}

export { DEFAULT_LOCALE };
