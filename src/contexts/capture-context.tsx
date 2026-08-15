import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useLocalePreference } from '@/contexts/locale-context';
import { formatDate, formatTime, formatWeekday } from '@/lib/datetime';
import { generatePhotoCode } from '@/lib/photo-code';
import { STAMP_LOCALE } from '@i18n/calendar';
import { LOCALES, type Locale } from '@i18n/locales';
import type {
  CaptureDraft,
  CaptureMetadata,
  SelectedPhoto,
  WatermarkFieldKey,
} from '@/types';

/**
 * O rascunho de captura — a foto escolhida e os metadados que vão ser
 * carimbados nela.
 *
 * Este provider fica montado na raiz, **acima** do navegador de abas. É o que
 * cumpre o critério de aceite: o usuário pode ir para a Galeria, entrar em
 * Configurações, mudar a posição da marca d'água e voltar para Capturar com a
 * foto e os campos exatamente como deixou.
 */

function buildInitialMetadata(locale: Locale, now: Date = new Date()): CaptureMetadata {
  return {
    time: formatTime(now),
    date: formatDate(now, locale),
    weekday: formatWeekday(now, locale),
    address: '',
    code: generatePhotoCode(),
  };
}

type CaptureContextValue = {
  draft: CaptureDraft;
  hasPhoto: boolean;
  setPhoto: (photo: SelectedPhoto | null) => void;
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
  const { locale: uiLocale } = useLocalePreference();

  /*
   * O carimbo desenha com as fontes embarcadas, que só têm latim. Um idioma
   * sem glifo viraria quadradinho vazio sobre a foto — pior que idioma
   * trocado, porque parece defeito. `STAMP_LOCALE` faz a queda para o inglês
   * onde falta alfabeto; a interface continua no idioma escolhido.
   */
  const locale = STAMP_LOCALE[uiLocale];

  const [draft, setDraft] = useState<CaptureDraft>(() => ({
    photo: null,
    metadata: buildInitialMetadata(locale),
  }));

  /**
   * Trocar o idioma reescreve a data e o dia da semana do rascunho aberto.
   *
   * Sem isto, quem escolhesse outro idioma com uma foto já na tela ficaria
   * com a interface num idioma e o carimbo no anterior — e o carimbo é o que
   * fica na foto. A hora não entra: número é número em toda língua.
   *
   * O ajuste acontece **durante o render**, e não num efeito. É o padrão do
   * React para reagir a uma mudança de contexto: ele reexecuta este
   * componente antes de pintar, sem passar pelo commit. Num efeito, seria a
   * renderização em cascata que `use-app-permissions` também evita.
   *
   * O que a pessoa digitou à mão sobrevive: só é reescrito o campo que ainda
   * contém exatamente o que o próprio aplicativo escreveu, em algum idioma.
   */
  const [writtenLocale, setWrittenLocale] = useState(locale);

  if (writtenLocale !== locale) {
    setWrittenLocale(locale);

    const now = new Date();
    const untouched = (value: string, format: (date: Date, locale: Locale) => string) =>
      LOCALES.some((candidate) => format(now, candidate) === value);

    setDraft((current) => {
      const date = untouched(current.metadata.date, formatDate)
        ? formatDate(now, locale)
        : current.metadata.date;
      const weekday = untouched(current.metadata.weekday, formatWeekday)
        ? formatWeekday(now, locale)
        : current.metadata.weekday;

      if (date === current.metadata.date && weekday === current.metadata.weekday) return current;

      return { ...current, metadata: { ...current.metadata, date, weekday } };
    });
  }


  const setPhoto = useCallback((photo: SelectedPhoto | null) => {
    setDraft((current) => ({ ...current, photo }));
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
        date: formatDate(now, locale),
        weekday: formatWeekday(now, locale),
      },
    }));
  }, [locale]);

  const resetDraft = useCallback(() => {
    setDraft({ photo: null, metadata: buildInitialMetadata(locale) });
  }, [locale]);

  const value = useMemo<CaptureContextValue>(
    () => ({
      draft,
      hasPhoto: draft.photo !== null,
      setPhoto,
      setField,
      regenerateCode,
      syncDateTime,
      resetDraft,
    }),
    [draft, setPhoto, setField, regenerateCode, syncDateTime, resetDraft],
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
