import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_WATERMARK_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  mergeWithDefaults,
  type StoredPreferences,
} from '@/features/watermark/preferences';
import { StorageKeys, readJson, writeJson } from '@/lib/storage';
import {
  WATERMARK_FIELD_KEYS,
  type BrandMode,
  type BrandPart,
  type CodePlacement,
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
 *
 * O padrão e a mescla vivem em `features/watermark/preferences`: são regra,
 * não estado, e este arquivo só cuida do ciclo de vida.
 */

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
  setShowBrand: (showBrand: boolean) => void;
  setBrandPosition: (brandPosition: WatermarkPosition) => void;
  setBrandMode: (brandMode: BrandMode) => void;
  /** Altera texto ou cor de uma das duas partes da marca própria. */
  setBrandPart: (index: 0 | 1, part: Partial<BrandPart>) => void;
  setCodePlacement: (codePlacement: CodePlacement) => void;
  resetPreferences: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<WatermarkPreferences>(
    DEFAULT_WATERMARK_PREFERENCES,
  );
  const [hydrated, setHydrated] = useState(false);
  /**
   * Trava de gravação: uma leitura que falhou não é disco vazio. Gravar
   * depois dela substituiria a configuração do usuário pelo padrão, por
   * causa de uma falha momentânea.
   */
  const [writable, setWritable] = useState(false);

  useEffect(() => {
    let active = true;

    void readJson<StoredPreferences>(StorageKeys.watermarkPreferences).then((result) => {
      if (!active) return;

      if (result.status === 'found') {
        setPreferences(mergeWithDefaults(result.value));
      }

      setWritable(result.status !== 'failed');
      setHydrated(true);
    }).catch((error: unknown) => {
      if (!active) return;
      // Sem isto, uma exceção deixaria `writable` em `false` para sempre e
      // nenhuma preferência voltaria a ser gravada — silenciosamente.
      console.warn('[settings] falha ao hidratar as preferências.', error);
      setWritable(false);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Só grava depois de hidratar com sucesso. A versão vai junto: é o que
  // permite migrar padrões numa atualização sem descartar o que o usuário
  // escolheu de fato.
  useEffect(() => {
    if (!hydrated || !writable) return;
    void writeJson(StorageKeys.watermarkPreferences, {
      ...preferences,
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
    });
  }, [hydrated, writable, preferences]);

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

  const setShowBrand = useCallback((showBrand: boolean) => {
    setPreferences((current) => ({ ...current, showBrand }));
  }, []);

  const setBrandPosition = useCallback((brandPosition: WatermarkPosition) => {
    setPreferences((current) => ({ ...current, brandPosition }));
  }, []);

  const setBrandMode = useCallback((brandMode: BrandMode) => {
    setPreferences((current) => ({ ...current, brandMode }));
  }, []);

  const setBrandPart = useCallback((index: 0 | 1, part: Partial<BrandPart>) => {
    setPreferences((current) => {
      const brandParts: [BrandPart, BrandPart] = [
        { ...current.brandParts[0] },
        { ...current.brandParts[1] },
      ];
      brandParts[index] = { ...brandParts[index], ...part };
      return { ...current, brandParts };
    });
  }, []);

  const setCodePlacement = useCallback((codePlacement: CodePlacement) => {
    setPreferences((current) => ({ ...current, codePlacement }));
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
      setShowBrand,
      setBrandPosition,
      setBrandMode,
      setBrandPart,
      setCodePlacement,
      resetPreferences,
    }),
    [
      preferences,
      hydrated,
      toggleField,
      setPosition,
      setScale,
      setShowBackdrop,
      setShowBrand,
      setBrandPosition,
      setBrandMode,
      setBrandPart,
      setCodePlacement,
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
