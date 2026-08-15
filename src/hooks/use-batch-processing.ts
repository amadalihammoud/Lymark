/**
 * Hook para gerenciar processamento em lote de fotos.
 *
 * Conforme decisão 2.4: processamento em lote é a justificativa de existência do desktop.
 * Requisitos:
 * - Arrastar e soltar N fotos na janela
 * - Mesmo endereço e mesmo código aplicados a todas
 * - A data de CADA foto vem do EXIF individualmente
 * - Saída para uma pasta escolhida pelo usuário
 * - Barra de progresso com contagem
 * - Relatório de falhas por arquivo ao final
 * - Processamento SERIAL, nunca paralelo (G3)
 */

import { useCallback, useState, useRef } from 'react';
import { useTranslations } from 'use-intl';

import { useLocalePreference } from '@/contexts/locale-context';
import { formatDate, formatTime, formatWeekday } from '@/lib/datetime';
import { extractDateTimeFromExif } from '@/lib/exif';
import { saveFileToOutput, getOutputFolder } from '@/lib/file-storage';
import { composeStampedPhoto } from '@/features/watermark/render-photo';
import { createStampRenderer, useStampTypefaces } from '@/features/watermark/skia-stamp';
import { scriptForStamp } from '@/features/watermark/stamp-script';
import { STAMP_COLORS } from '@/features/watermark/stamp-colors';
import { useSettings } from '@/contexts/settings-context';
import { STAMP_LOCALE } from '@i18n/calendar';
import type { CaptureMetadata, WatermarkFieldKey } from '@/types';

export interface BatchPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface BatchResult {
  total: number;
  success: number;
  failed: number;
  failures: Array<{ file: string; error: string }>;
}

export interface BatchProcessingState {
  isProcessing: boolean;
  current: number;
  total: number;
  progress: number; // 0-100
  results: BatchResult;
}

const INITIAL_STATE: BatchProcessingState = {
  isProcessing: false,
  current: 0,
  total: 0,
  progress: 0,
  results: { total: 0, success: 0, failed: 0, failures: [] },
};

export function useBatchProcessing() {
  const t = useTranslations('app.common');
  const [state, setState] = useState<BatchProcessingState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  // `weekday` faz parte do carimbo tanto quanto os outros; ausente daqui, o
  // objeto não satisfazia CaptureMetadata. `company` não existe como campo de
  // metadado — a marca da empresa vem das preferências.
  const [metadata, setMetadata] = useState<CaptureMetadata>({
    code: '',
    address: '',
    date: '',
    time: '',
    weekday: '',
  });
  const [outputFolder, setOutputFolder] = useState<string>('');

  // A data de cada foto é reescrita a partir do EXIF, então precisa do mesmo
  // idioma de carimbo que a aba Capturar usa — o da interface, com a queda de
  // `STAMP_LOCALE` onde falta alfabeto.
  const { locale: uiLocale } = useLocalePreference();
  const stampLocale = STAMP_LOCALE[uiLocale];

  const { preferences } = useSettings();

  // O desenho do carimbo precisa das fontes e das preferências, e ambas só
  // chegam por hook — daí virem do topo, e não de dentro do laço.
  // O endereço e a marca são os mesmos para todas as fotos, e a data só muda
  // de dia, não de alfabeto: o alfabeto é decidido uma vez, não por foto.
  const stampTypefaces = useStampTypefaces(scriptForStamp(metadata, preferences));

  /**
   * Carrega a pasta de saída atual ao montar o componente.
   */
  const loadOutputFolder = useCallback(async () => {
    const folder = await getOutputFolder();
    setOutputFolder(folder);
  }, []);

  /**
   * Processa uma única foto do lote.
   * Lê EXIF para data individual, mas usa metadata compartilhado para endereço e código.
   */
  const processSinglePhoto = useCallback(
    async (photo: BatchPhoto, sharedMetadata: CaptureMetadata): Promise<{ success: boolean; file?: string; error?: string }> => {
      try {
        if (!stampTypefaces) {
          throw new Error('As fontes do carimbo ainda estão carregando.');
        }

        // LER EXIF DA FOTO INDIVIDUAL (requisito 2.4)
        //
        // Data, hora e dia da semana saem do MESMO `Date`. Antes, a data vinha
        // do EXIF e o dia da semana continuava o do lote: uma foto tirada na
        // terça saía carimbada "12 ago. 2026 · Sáb". Numa foto de comprovação,
        // essa contradição fica impressa no próprio documento.
        const exif = await extractDateTimeFromExif(photo.uri);
        const tirada = exif?.dateTime;

        // Mesclar: data/hora do EXIF + endereço/código compartilhado
        const photoMetadata: CaptureMetadata = {
          ...sharedMetadata,
          date: tirada ? formatDate(tirada, stampLocale) : sharedMetadata.date,
          time: tirada ? formatTime(tirada) : sharedMetadata.time,
          weekday: tirada ? formatWeekday(tirada, stampLocale) : sharedMetadata.weekday,
        };

        // `composeStampedPhoto` devolve os bytes sem gravar. O caminho de
        // gravação do app abriria um diálogo por foto no desktop, o que
        // inviabilizaria o lote.
        const stampedBytes = await composeStampedPhoto({
          photoUri: photo.uri,
          metadata: photoMetadata,
          preferences,
          colors: STAMP_COLORS,
          renderer: createStampRenderer(stampTypefaces),
        });

        // Nome estável e sem colisão: o carimbo do relógio não basta quando
        // duas fotos são processadas no mesmo milissegundo.
        const origem = photo.uri.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'foto';
        const fileName = `lymark_${origem}_${photo.width}x${photo.height}.jpg`;

        const result = await saveFileToOutput(stampedBytes, fileName, 'image/jpeg');

        if (result.status !== 'saved') {
          throw new Error(result.status === 'failed' && result.error
            ? String(result.error)
            : 'Falha ao salvar arquivo');
        }

        return { success: true, file: fileName };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    },
    [stampTypefaces, preferences, stampLocale],
  );

  /**
   * Processa todas as fotos do lote SERIALMENTE (requisito G3).
   * Processamento paralelo estouraria a memória do WASM.
   */
  const processBatch = useCallback(
    async (photos: BatchPhoto[]) => {
      // Criar novo AbortController para esta execução
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({
        ...INITIAL_STATE,
        isProcessing: true,
        total: photos.length,
      });

      const results: BatchResult = {
        total: photos.length,
        success: 0,
        failed: 0,
        failures: [],
      };

      // PROCESSAMENTO SERIAL (nunca paralelo - G3)
      for (let i = 0; i < photos.length; i++) {
        // Verificar se foi solicitado cancelamento
        if (abortController.signal.aborted) {
          break;
        }

        const photo = photos[i];

        // Otimizar re-renders: atualizar progresso a cada 10 fotos ou 1%
        if (i % 10 === 0 || i === photos.length - 1) {
          setState((prev) => ({
            ...prev,
            current: i + 1,
            progress: Math.round(((i + 1) / photos.length) * 100),
          }));
        }

        try {
          const result = await processSinglePhoto(photo, metadata);

          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.failures.push({
              file: photo.uri.split('/').pop() || photo.uri,
              error: result.error || 'Erro desconhecido',
            });
          }
        } catch (error) {
          // Tratar erros não capturados por processSinglePhoto
          results.failed++;
          results.failures.push({
            file: photo.uri.split('/').pop() || photo.uri,
            error: error instanceof Error ? error.message : t('unknownError'),
          });
        }
      }

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        results,
      }));

      return results;
    },
    [metadata, processSinglePhoto],
  );

  const startBatch = useCallback(
    (photos: BatchPhoto[]) => {
      // Resetar resultados
      setState({
        ...INITIAL_STATE,
        isProcessing: true,
        total: photos.length,
      });

      // Iniciar processamento
      return processBatch(photos);
    },
    [processBatch],
  );

  const cancelBatch = useCallback(() => {
    // Abortar o processamento em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
  }, []);

  const updateMetadata = useCallback((newMetadata: Partial<CaptureMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...newMetadata }));
  }, []);

  const setOutputFolderPath = useCallback((folderPath: string) => {
    setOutputFolder(folderPath);
  }, []);

  return {
    state,
    metadata,
    outputFolder,
    updateMetadata,
    setOutputFolderPath,
    startBatch,
    cancelBatch,
    loadOutputFolder,
  };
}
