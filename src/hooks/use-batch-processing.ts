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

import { useCallback, useState } from 'react';

import { extractDateFromExif, extractTimeFromExif } from '@/lib/exif';
import { renderStampedPhoto } from '@/features/watermark/render-photo';
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
  const [state, setState] = useState<BatchProcessingState>(INITIAL_STATE);
  const [metadata, setMetadata] = useState<CaptureMetadata>({
    code: '',
    address: '',
    date: '',
    time: '',
    company: '',
  });
  const [outputFolder, setOutputFolder] = useState<string>('');

  /**
   * Processa uma única foto do lote.
   * Lê EXIF para data individual, mas usa metadata compartilhado para endereço e código.
   */
  const processSinglePhoto = useCallback(
    async (photo: BatchPhoto, sharedMetadata: CaptureMetadata): Promise<{ success: boolean; file?: string; error?: string }> => {
      try {
        // LER EXIF DA FOTO INDIVIDUAL (requisito 2.4)
        const exifDate = await extractDateFromExif(photo.uri);
        const exifTime = await extractTimeFromExif(photo.uri);

        // Mesclar: data/hora do EXIF + endereço/código compartilhado
        const photoMetadata: CaptureMetadata = {
          ...sharedMetadata,
          date: exifDate || sharedMetadata.date,
          time: exifTime || sharedMetadata.time,
        };

        // Gerar a foto com carimbo
        const stampedBytes = await renderStampedPhoto(photo.uri, photoMetadata);

        // Salvar na pasta de saída (usando saveFileToOutput do desktop)
        const timestamp = Date.now();
        const fileName = `lymark_${timestamp}_${photo.width}x${photo.height}.jpg`;
        
        // Verificar se estamos no desktop e se a API está disponível
        if (typeof window !== 'undefined' && window.lymark?.saveFileToOutput) {
          await window.lymark.saveFileToOutput(stampedBytes, fileName, 'image/jpeg');
        }

        return { success: true, file: fileName };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    },
    [],
  );

  /**
   * Processa todas as fotos do lote SERIALMENTE (requisito G3).
   * Processamento paralelo estouraria a memória do WASM.
   */
  const processBatch = useCallback(
    async (photos: BatchPhoto[]) => {
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
        const photo = photos[i];
        
        setState((prev) => ({
          ...prev,
          current: i + 1,
          progress: Math.round(((i + 1) / photos.length) * 100),
        }));

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
    // Por enquanto, não há como cancelar um processamento serial
    // Futuramente: adicionar flag de cancelamento
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
  };
}
