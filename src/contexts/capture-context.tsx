import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { formatDate, formatTime, formatWeekday } from '@/lib/datetime';
import { generatePhotoCode } from '@/lib/photo-code';
import type { CaptureDraft, CaptureMetadata, WatermarkFieldKey } from '@/types';

/**
 * O rascunho de captura — a foto escolhida e os metadados que vão ser
 * carimbados nela.
 *
 * Este provider fica montado na raiz, **acima** do navegador de abas. É o que
 * cumpre o critério de aceite: o usuário pode ir para a Galeria, entrar em
 * Configurações, mudar a posição da marca d'água e voltar para Capturar com a
 * foto e os campos exatamente como deixou.
 */

function buildInitialMetadata(now: Date = new Date()): CaptureMetadata {
  return {
    time: formatTime(now),
    date: formatDate(now),
    weekday: formatWeekday(now),
    address: '',
    code: generatePhotoCode(),
  };
}

type CaptureContextValue = {
  draft: CaptureDraft;
  hasPhoto: boolean;
  setPhotoUri: (uri: string | null) => void;
  setField: (key: WatermarkFieldKey, value: string) => void;
  /** Sorteia um novo Código de Foto (botão "Gerar"). */
  regenerateCode: () => void;
  /** Realinha hora/data/dia da semana com o relógio atual. */
  syncDateTime: () => void;
  /** Limpa tudo e começa uma captura nova. */
  resetDraft: () => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CaptureDraft>(() => ({
    photoUri: null,
    metadata: buildInitialMetadata(),
  }));

  const setPhotoUri = useCallback((photoUri: string | null) => {
    setDraft((current) => ({ ...current, photoUri }));
  }, []);

  const setField = useCallback((key: WatermarkFieldKey, value: string) => {
    setDraft((current) => ({
      ...current,
      metadata: { ...current.metadata, [key]: value },
    }));
  }, []);

  const regenerateCode = useCallback(() => {
    setDraft((current) => ({
      ...current,
      metadata: { ...current.metadata, code: generatePhotoCode() },
    }));
  }, []);

  const syncDateTime = useCallback(() => {
    const now = new Date();
    setDraft((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        time: formatTime(now),
        date: formatDate(now),
        weekday: formatWeekday(now),
      },
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft({ photoUri: null, metadata: buildInitialMetadata() });
  }, []);

  const value = useMemo<CaptureContextValue>(
    () => ({
      draft,
      hasPhoto: draft.photoUri !== null,
      setPhotoUri,
      setField,
      regenerateCode,
      syncDateTime,
      resetDraft,
    }),
    [draft, setPhotoUri, setField, regenerateCode, syncDateTime, resetDraft],
  );

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useCapture(): CaptureContextValue {
  const context = useContext(CaptureContext);
  if (!context) {
    throw new Error('useCapture precisa estar dentro de <CaptureProvider>.');
  }
  return context;
}
