import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { StorageKeys, readJson, writeJson } from '@/lib/storage';
import {
  WATERMARK_FIELD_KEYS,
  type WatermarkFieldKey,
  type WatermarkPosition,
  type WatermarkPreferences,
  type WatermarkScale,
} from '@/types';

/**
 * Preferências de marca d'água — quais campos carimbar, onde e como.
 *
 * Ficam acima das abas e são persistidas: a configuração escolhida uma vez
 * vale para todas as fotos seguintes, inclusive depois de fechar o app.
 */

export const DEFAULT_WATERMARK_PREFERENCES: WatermarkPreferences = {
  visibleFields: {
    time: true,
    date: true,
    weekday: true,
    address: true,
    code: true,
  },
  position: 'bottom-left',
  scale: 'medium',
  showBackdrop: true,
};

/**
 * Reconstrói as preferências a partir do que estava salvo.
 *
 * Um app atualizado pode ler dados gravados por uma versão anterior, que não
 * conhecia todos os campos. Mesclar contra o padrão evita `undefined`
 * chegando na renderização da marca d'água.
 */
function mergeWithDefaults(stored: Partial<WatermarkPreferences>): WatermarkPreferences {
  const visibleFields = { ...DEFAULT_WATERMARK_PREFERENCES.visibleFields };
  for (const key of WATERMARK_FIELD_KEYS) {
    const value = stored.visibleFields?.[key];
    if (typeof value === 'boolean') visibleFields[key] = value;
  }

  return {
    visibleFields,
    position: stored.position ?? DEFAULT_WATERMARK_PREFERENCES.position,
    scale: stored.scale ?? DEFAULT_WATERMARK_PREFERENCES.scale,
    showBackdrop: stored.showBackdrop ?? DEFAULT_WATERMARK_PREFERENCES.showBackdrop,
  };
}

type SettingsContextValue = {
  preferences: WatermarkPreferences;
  /** `false` enquanto o disco ainda não respondeu — evita piscar o padrão. */
  hydrated: boolean;
  /** Quantos campos estão marcados para aparecer na foto. */
  visibleFieldCount: number;
  toggleField: (key: WatermarkFieldKey) => void;
  setPosition: (position: WatermarkPosition) => void;
  setScale: (scale: WatermarkScale) => void;
  setShowBackdrop: (showBackdrop: boolean) => void;
  resetPreferences: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<WatermarkPreferences>(
    DEFAULT_WATERMARK_PREFERENCES,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    readJson<Partial<WatermarkPreferences>>(StorageKeys.watermarkPreferences, {}).then(
      (stored) => {
        if (!active) return;
        setPreferences(mergeWithDefaults(stored));
        setHydrated(true);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  // Só grava depois de hidratar, senão o padrão sobrescreveria o que estava salvo.
  useEffect(() => {
    if (!hydrated) return;
    void writeJson(StorageKeys.watermarkPreferences, preferences);
  }, [hydrated, preferences]);

  const toggleField = useCallback((key: WatermarkFieldKey) => {
    setPreferences((current) => ({
      ...current,
      visibleFields: { ...current.visibleFields, [key]: !current.visibleFields[key] },
    }));
  }, []);

  const setPosition = useCallback((position: WatermarkPosition) => {
    setPreferences((current) => ({ ...current, position }));
  }, []);

  const setScale = useCallback((scale: WatermarkScale) => {
    setPreferences((current) => ({ ...current, scale }));
  }, []);

  const setShowBackdrop = useCallback((showBackdrop: boolean) => {
    setPreferences((current) => ({ ...current, showBackdrop }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_WATERMARK_PREFERENCES);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      preferences,
      hydrated,
      visibleFieldCount: WATERMARK_FIELD_KEYS.filter((key) => preferences.visibleFields[key])
        .length,
      toggleField,
      setPosition,
      setScale,
      setShowBackdrop,
      resetPreferences,
    }),
    [
      preferences,
      hydrated,
      toggleField,
      setPosition,
      setScale,
      setShowBackdrop,
      resetPreferences,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings precisa estar dentro de <SettingsProvider>.');
  }
  return context;
}
