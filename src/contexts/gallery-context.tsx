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

import { StorageKeys, readJson, writeJson } from '@/lib/storage';
import type { CaptureMetadata, GalleryEntry } from '@/types';

/**
 * Histórico das fotos exportadas.
 *
 * Guarda apenas a URI e os metadados — a imagem em si mora no sistema de
 * arquivos do app / na galeria do aparelho. O registro é o índice que a aba
 * Galeria percorre, do mais recente para o mais antigo.
 */

/** Teto de registros mantidos, para o índice não crescer sem limite. */
const MAX_ENTRIES = 200;

type GalleryContextValue = {
  entries: GalleryEntry[];
  hydrated: boolean;
  addEntry: (input: { uri: string; metadata: CaptureMetadata }) => GalleryEntry;
  removeEntry: (id: string) => void;
  clearGallery: () => void;
  findEntry: (id: string) => GalleryEntry | undefined;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    readJson<GalleryEntry[]>(StorageKeys.gallery, []).then((stored) => {
      if (!active) return;
      setEntries(Array.isArray(stored) ? stored : []);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeJson(StorageKeys.gallery, entries);
  }, [hydrated, entries]);

  const addEntry = useCallback<GalleryContextValue['addEntry']>(({ uri, metadata }) => {
    const entry: GalleryEntry = {
      id: Crypto.randomUUID(),
      uri,
      exportedAt: new Date().toISOString(),
      metadata,
    };
    setEntries((current) => [entry, ...current].slice(0, MAX_ENTRIES));
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearGallery = useCallback(() => setEntries([]), []);

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
