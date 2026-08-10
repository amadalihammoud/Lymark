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
import { saveFileToOutput, getOutputFolder } from '@/lib/file-storage';
import { composeStampedPhoto } from '@/features/watermark/render-photo';
import { createStampRenderer, useStampTypefaces } from '@/features/watermark/skia-stamp';
import { STAMP_COLORS } from '@/features/watermark/stamp-colors';
import { useSettings } from '@/contexts/settings-context';
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

  // O desenho do carimbo precisa das fontes e das preferências, e ambas só
  // chegam por hook — daí virem do topo, e não de dentro do laço.
  const stampTypefaces = useStampTypefaces();
  const { preferences } = useSettings();

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
        const exifDate = await extractDateFromExif(photo.uri);
        const exifTime = await extractTimeFromExif(photo.uri);

        // Mesclar: data/hora do EXIF + endereço/código compartilhado
        const photoMetadata: CaptureMetadata = {
          ...sharedMetadata,
          date: exifDate || sharedMetadata.date,
          time: exifTime || sharedMetadata.time,
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
    [stampTypefaces, preferences],
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
