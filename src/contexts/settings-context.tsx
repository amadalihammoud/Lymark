import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { deleteLogo } from '@/features/watermark/logo-file';
import {
  DEFAULT_WATERMARK_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  mergeWithDefaults,
  newBrandLogo,
  type StoredPreferences,
} from '@/features/watermark/preferences';
import { StorageKeys, readJson, writeJson } from '@/lib/storage';
import {
  MAX_BRAND_LOGOS,
  WATERMARK_FIELD_KEYS,
  type BrandLogo,
  type BrandPart,
  type WatermarkFieldKey,
  type WatermarkPreferences,
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
  /**
   * Altera um ou mais ajustes de uma vez.
   *
   * Havia um setter dedicado por preferência. Com o carimbo ganhando cores
   * livres, logotipo e faixa configurável, isso virou uma lista de treze
   * funções idênticas a menos do nome do campo — e cada ajuste novo exigia
   * escrever a mesma linha em três lugares.
   */
  updatePreferences: (patch: Partial<WatermarkPreferences>) => void;
  /** Altera texto ou cor de uma das duas partes da marca própria. */
  setBrandPart: (index: 0 | 1, part: Partial<BrandPart>) => void;
  /**
   * Troca ou remove o logotipo de um dos lugares, apagando o arquivo anterior.
   *
   * Sem isso cada troca deixaria um arquivo órfão no aparelho para sempre —
   * o app pediria espaço e nunca o devolveria. O lugar é o índice na lista;
   * `null` remove, e o que vinha depois sobe.
   */
  setBrandLogo: (index: number, logo: { path: string; aspect: number } | null) => void;
  /** Ajusta posição ou tamanho de um logotipo que já existe. */
  updateBrandLogo: (index: number, patch: Partial<Omit<BrandLogo, 'path' | 'aspect'>>) => void;
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

  const updatePreferences = useCallback((patch: Partial<WatermarkPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const setBrandLogo = useCallback(
    (index: number, logo: { path: string; aspect: number } | null) => {
      // I/O fora do atualizador: o React pode reexecutá-lo, e apagar o
      // arquivo duas vezes — ou no meio de um cálculo de estado — é efeito
      // colateral. O caminho anterior vem do estado já conhecido, como em
      // `removeEntry` da galeria. Só apaga se nenhum OUTRO logotipo usar o
      // mesmo arquivo.
      const previous = preferences.brandLogos[index];
      const stillUsed = preferences.brandLogos.some(
        (item, i) => i !== index && item.path === previous?.path,
      );
      if (previous && previous.path !== logo?.path && !stillUsed) {
        deleteLogo(previous.path);
      }

      setPreferences((current) => {
        const brandLogos = [...current.brandLogos];
        if (logo === null) {
          brandLogos.splice(index, 1);
        } else if (index < brandLogos.length) {
          // Trocar o arquivo mantém posição e tamanho: quem só atualizou a
          // arte não quer reposicionar tudo. A proporção nova entra junto.
          brandLogos[index] = { ...brandLogos[index], path: logo.path, aspect: logo.aspect };
        } else if (brandLogos.length < MAX_BRAND_LOGOS) {
          const fresh = newBrandLogo(logo);
          // Um segundo logotipo nasce solto: o cabeçalho tem um lugar só, e
          // ele já está ocupado — ou a pessoa desligou o cabeçalho.
          if (brandLogos.some((item) => item.placement === 'block')) fresh.placement = 'free';
          brandLogos.push(fresh);
        }
        return { ...current, brandLogos };
      });
    },
    [preferences.brandLogos],
  );

  const updateBrandLogo = useCallback(
    (index: number, patch: Partial<Omit<BrandLogo, 'path' | 'aspect'>>) => {
      setPreferences((current) => {
        if (!current.brandLogos[index]) return current;
        const brandLogos = current.brandLogos.map((item, i) => {
          if (i === index) return { ...item, ...patch };
          // Só um cabe junto ao carimbo: quem entra lá tira o outro de lá.
          if (patch.placement === 'block' && item.placement === 'block') {
            return { ...item, placement: 'free' as const };
          }
          return item;
        });
        return { ...current, brandLogos };
      });
    },
    [],
  );

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

  const resetPreferences = useCallback(() => {
    // O logotipo é arquivo, e não ajuste: restaurar o padrão o descarta das
    // preferências, então ele precisa sair do disco junto — fora do atualizador.
    for (const path of new Set(preferences.brandLogos.map((logo) => logo.path))) deleteLogo(path);
    setPreferences(DEFAULT_WATERMARK_PREFERENCES);
  }, [preferences.brandLogos]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      preferences,
      hydrated,
      visibleFieldCount: WATERMARK_FIELD_KEYS.filter((key) => preferences.visibleFields[key])
        .length,
      toggleField,
      updatePreferences,
      setBrandPart,
      setBrandLogo,
      updateBrandLogo,
      resetPreferences,
    }),
    [
      preferences,
      hydrated,
      toggleField,
      updatePreferences,
      setBrandPart,
      setBrandLogo,
      updateBrandLogo,
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
