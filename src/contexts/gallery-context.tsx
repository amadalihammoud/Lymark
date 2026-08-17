import * as Crypto from 'expo-crypto';
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
  deleteExportedPhoto,
  normalizeStoredPath,
} from '@/features/watermark/photo-file';
import { StorageKeys, readJson, writeJson } from '@/lib/storage';
import {
  WATERMARK_FIELD_KEYS,
  type CaptureMetadata,
  type GalleryEntry,
  type WatermarkFieldKey,
} from '@/types';

/**
 * Histórico das fotos exportadas.
 *
 * Guarda o caminho do arquivo e os metadados — a imagem em si mora no
 * sistema de arquivos do app. O registro é o índice que a aba Galeria
 * percorre, do mais recente para o mais antigo, e é a **única** referência
 * ao arquivo: sempre que uma entrada sai daqui, o arquivo tem de sair junto,
 * ou vira lixo permanente no aparelho.
 */

/** Teto de registros mantidos, para o índice não crescer sem limite. */
const MAX_ENTRIES = 200;

/** Descarta registros irrecuperáveis e migra os que gravavam URI absoluta. */
function reviveEntries(stored: unknown): GalleryEntry[] {
  if (!Array.isArray(stored)) return [];

  return stored.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];

    const candidate = entry as Partial<GalleryEntry> & { uri?: unknown };
    // `uri` é o nome que o formato antigo usava para o mesmo dado.
    const path = normalizeStoredPath(candidate.path ?? candidate.uri);

    // Sem caminho recuperável não há arquivo a apagar — só o registro morto.
    if (!path) return [];

    // O arquivo tem de sair junto com o registro (ver o cabeçalho deste
    // módulo). Um registro com caminho válido mas id ou metadata corrompidos
    // era descartado aqui e o arquivo ficava no aparelho para sempre —
    // invisível na galeria e inalcançável para apagar.
    if (typeof candidate.id !== 'string') {
      deleteExportedPhoto(path);
      return [];
    }

    // `truthy` não basta: um campo gravado como número por uma versão antiga
    // faz `.trim()` lançar, e o throw acontece dentro do `.then` da
    // hidratação — o app fica sem histórico e sem gravar, para sempre, sem
    // conserto possível dentro do aplicativo.
    const metadata = normalizeMetadata(candidate.metadata);
    if (!metadata) {
      deleteExportedPhoto(path);
      return [];
    }

    // Registros gravados antes de `stampedFields` existir: assumimos que
    // todos os campos com conteúdo foram carimbados, que era o comportamento
    // daquela versão.
    const stampedFields = Array.isArray(candidate.stampedFields)
      ? candidate.stampedFields.filter((key): key is WatermarkFieldKey =>
          (WATERMARK_FIELD_KEYS as readonly string[]).includes(key as string),
        )
      : WATERMARK_FIELD_KEYS.filter((key) => metadata[key].trim());

    return [
      {
        id: candidate.id,
        path,
        exportedAt:
          typeof candidate.exportedAt === 'string'
            ? candidate.exportedAt
            : new Date().toISOString(),
        metadata,
        stampedFields,
      },
    ];
  });
}

/**
 * Converte o que está gravado num `CaptureMetadata` de verdade.
 *
 * Devolve `null` quando o registro não é aproveitável, para que ele seja
 * descartado em vez de derrubar a hidratação de todos os outros.
 */
function normalizeMetadata(value: unknown): CaptureMetadata | null {
  if (typeof value !== 'object' || value === null) return null;

  const source = value as Record<string, unknown>;
  const metadata = {} as CaptureMetadata;

  for (const key of WATERMARK_FIELD_KEYS) {
    const field = source[key];
    metadata[key] = typeof field === 'string' ? field : '';
  }

  return metadata;
}

type GalleryContextValue = {
  entries: GalleryEntry[];
  hydrated: boolean;
  addEntry: (input: {
    path: string;
    metadata: CaptureMetadata;
    stampedFields: WatermarkFieldKey[];
  }) => GalleryEntry;
  removeEntry: (id: string) => void;
  clearGallery: () => void;
  findEntry: (id: string) => GalleryEntry | undefined;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  /**
   * Trava de gravação.
   *
   * Uma leitura que falha não significa disco vazio. Gravar depois dela
   * sobrescreveria o histórico íntegro com uma lista vazia — o usuário
   * perderia centenas de registros por causa de uma falha momentânea.
   */
  const [writable, setWritable] = useState(false);

  useEffect(() => {
    let active = true;

    void readJson<unknown>(StorageKeys.gallery).then((result) => {
      if (!active) return;

      if (result.status === 'found') {
        const revived = reviveEntries(result.value);
        // Mescla em vez de substituir: uma exportação concluída antes da
        // leitura terminar seria descartada, e seu arquivo viraria órfão.
        setEntries((current) => {
          if (current.length === 0) return revived;
          const known = new Set(current.map((entry) => entry.id));
          return [...current, ...revived.filter((entry) => !known.has(entry.id))];
        });
      }

      setWritable(result.status !== 'failed');
      setHydrated(true);
    }).catch((error: unknown) => {
      if (!active) return;
      // Sem este catch, uma exceção aqui deixaria `hydrated` e `writable` em
      // `false` para sempre: a galeria não mostraria nem os itens nem o estado
      // vazio, e nenhuma exportação seria persistida — em silêncio.
      console.warn('[gallery] falha ao hidratar o histórico.', error);
      setWritable(false);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !writable) return;
    void writeJson(StorageKeys.gallery, entries);
  }, [hydrated, writable, entries]);

  const addEntry = useCallback<GalleryContextValue['addEntry']>(
    ({ path, metadata, stampedFields }) => {
      const entry: GalleryEntry = {
        id: Crypto.randomUUID(),
        path,
        exportedAt: new Date().toISOString(),
        metadata,
        stampedFields,
      };

      // O corte pelo teto tem de apagar o arquivo, como faz `removeEntry`:
      // sair do índice sem sair do disco deixa lixo inalcançável para sempre.
      entries.slice(MAX_ENTRIES - 1).forEach((old) => deleteExportedPhoto(old.path));

      setEntries((current) => [entry, ...current].slice(0, MAX_ENTRIES));
      return entry;
    },
    [entries],
  );

  // O arquivo sai antes do `setEntries`, e não dentro do atualizador: o React
  // pode reexecutar um atualizador, e efeito colateral ali dentro roda duas
  // vezes.
  const removeEntry = useCallback(
    (id: string) => {
      const target = entries.find((entry) => entry.id === id);
      if (target) deleteExportedPhoto(target.path);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    },
    [entries],
  );

  const clearGallery = useCallback(() => {
    entries.forEach((entry) => deleteExportedPhoto(entry.path));
    setEntries([]);
  }, [entries]);

  const findEntry = useCallback(
    (id: string) => entries.find((entry) => entry.id === id),
    [entries],
  );

  const value = useMemo<GalleryContextValue>(
    () => ({ entries, hydrated, addEntry, removeEntry, clearGallery, findEntry }),
    [entries, hydrated, addEntry, removeEntry, clearGallery, findEntry],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery(): GalleryContextValue {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery precisa estar dentro de <GalleryProvider>.');
  }
  return context;
}
