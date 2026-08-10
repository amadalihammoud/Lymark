/**
 * Tela de processamento em lote para desktop.
 *
 * Conforme decisão 2.4: o processamento em lote é a justificativa de existência do desktop.
 * Esta tela só está disponível no desktop (window.lymark.platform === 'desktop').
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextInput } from '@/components/ui/field-row';
import { colors, radius, spacing, typography } from '@/theme';
import { useBatchProcessing } from '@/hooks/use-batch-processing';
import { isDesktop } from '@/lib/file-storage';
import type { WatermarkFieldKey } from '@/types';

const WATERMARK_FIELDS: WatermarkFieldKey[] = ['code', 'address', 'company'];

export default function BatchProcessingScreen() {
  const { state, metadata, outputFolder, updateMetadata, setOutputFolderPath, startBatch, cancelBatch, loadOutputFolder } = useBatchProcessing();
  const [photos, setPhotos] = useState<{ uri: string; width: number; height: number }[]>([]);

  // Somente disponível no desktop
  if (!isDesktop()) {
    return (
      <Screen>
        <Text style={typography.heading}>Processamento em lote não disponível</Text>
        <Text style={typography.body}>Esta funcionalidade é apenas para desktop.</Text>
      </Screen>
    );
  }

  // Carregar pasta de saída ao montar o componente
  useEffect(() => {
    loadOutputFolder();
  }, [loadOutputFolder]);

  // Configurar drag and drop ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined' && window.lymark?.onDragDrop) {
      window.lymark.onDragDrop((photo) => {
        if (photo) {
          setPhotos((prev) => [...prev, photo]);
        }
      });
    }
  }, []);

  // Handler para selecionar fotos
  const handleSelectPhotos = useCallback(async () => {
    if (typeof window !== 'undefined' && window.lymark?.pickImages) {
      const result = await window.lymark.pickImages();
      if (result.status === 'selected' && result.photos) {
        setPhotos(result.photos);
      }
    }
  }, []);

  // Handler para selecionar pasta de saída
  const handleSelectOutputFolder = useCallback(async () => {
    if (typeof window !== 'undefined' && window.lymark?.selectOutputFolder) {
      const result = await window.lymark.selectOutputFolder();
      if (result.status === 'selected' && result.path) {
        setOutputFolderPath(result.path);
      }
    }
  }, [setOutputFolderPath]);

  // Handler para iniciar processamento
  const handleStartProcessing = useCallback(() => {
    if (photos.length === 0) {
      alert('Selecione pelo menos uma foto');
      return;
    }
    startBatch(photos);
  }, [photos, startBatch]);

  // Handler para cancelar processamento
  const handleCancelProcessing = useCallback(() => {
    cancelBatch();
  }, [cancelBatch]);

  // Remover uma foto da lista
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Limpar todas as fotos
  const handleClearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return (
    <Screen scrollable={false}>
      <Text style={[typography.heading, styles.title]}>Processamento em Lote</Text>

      <Section title="Fotos para processar">
        <Text style={typography.caption}>
          {photos.length} foto(s) selecionada(s)
        </Text>
        
        <View style={styles.actions}>
          <Button
            label="Selecionar Fotos"
            icon="image-outline"
            onPress={handleSelectPhotos}
          />
          <Button
            label="Limpar Lista"
            icon="trash-outline"
            variant="danger"
            onPress={handleClearPhotos}
            disabled={photos.length === 0}
          />
        </View>

        {/* Área de drag and drop */}
        <View style={styles.dropZone}>
          <Text style={[typography.caption, styles.dropZoneText]}>
            Arraste e solte fotos aqui ou use o botão "Selecionar Fotos"
          </Text>
        </View>

        {photos.length > 0 && (
          <View style={styles.photosList}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                <View style={styles.photoInfo}>
                  <Text style={typography.caption} numberOfLines={1}>
                    {photo.uri.split('/').pop()}
                  </Text>
                  <Text style={[typography.caption, styles.photoSize]}>
                    {photo.width}x{photo.height}
                  </Text>
                </View>
                <Button
                  label="Remover"
                  icon="close"
                  variant="ghost"
                  size="small"
                  onPress={() => handleRemovePhoto(index)}
                />
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Metadados compartilhados">
        <Text style={[typography.caption, styles.caption]}>
          Estes valores serão aplicados a TODAS as fotos. A data/hora de cada foto
          será lida do EXIF individualmente.
        </Text>

        {WATERMARK_FIELDS.map((field) => (
          <TextInput
            key={field}
            label={field === 'code' ? 'Código' : field === 'address' ? 'Endereço' : 'Empresa'}
            value={metadata[field]}
            onChangeText={(value) => updateMetadata({ [field]: value })}
            placeholder={field === 'code' ? 'Ex: LYM-001' : field === 'address' ? 'Rua, número - Cidade' : 'Nome da empresa'}
            style={styles.input}
          />
        ))}
      </Section>

      <Section title="Saída">
        <View style={styles.folderSelection}>
          <Button
            label={outputFolder ? `Pasta: ${outputFolder.split('/').pop()}` : 'Selecionar Pasta de Saída'}
            icon="folder-open-outline"
            variant="secondary"
            onPress={handleSelectOutputFolder}
          />
          {outputFolder && (
            <Text style={[typography.caption, styles.folderPath]}>
              {outputFolder}
            </Text>
          )}
        </View>
        <Text style={[typography.caption, styles.caption]}>
          As fotos processadas serão salvas na pasta selecionada.
        </Text>
      </Section>

      {state.isProcessing ? (
        <Section title="Processando...">
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${state.progress}%` }]} />
            <Text style={styles.progressText}>
              {state.current} de {state.total} ({`${Math.round(state.progress)}%`})
            </Text>
          </View>
          <Button
            label="Cancelar"
            variant="danger"
            onPress={handleCancelProcessing}
            disabled={!state.isProcessing}
          />
        </Section>
      ) : (
        <Button
          label="Iniciar Processamento"
          icon="play-circle-outline"
          onPress={handleStartProcessing}
          disabled={photos.length === 0}
        />
      )}

      {state.results.failures.length > 0 && (
        <Section title="Erros">
          <Text style={typography.caption}>
            {state.results.success} sucesso(s), {state.results.failed} falha(s)
          </Text>
          {state.results.failures.map((failure, index) => (
            <View key={`error-${index}`} style={styles.errorItem}>
              <Text style={[typography.caption, styles.errorFile]}>
                {failure.file}
              </Text>
              <Text style={[typography.caption, styles.errorMessage]}>
                {failure.error}
              </Text>
            </View>
          ))}
        </Section>
      )}

      {state.isProcessing === false && state.results.total > 0 && state.results.failures.length === 0 && state.results.success > 0 && (
        <Section title="Concluído">
          <Text style={[typography.body, styles.successMessage]}>
            Processamento concluído com sucesso! {state.results.success} foto(s) processada(s).
          </Text>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.caption,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    minHeight: 80,
  },
  dropZoneText: {
    color: colors.caption,
    textAlign: 'center',
  },
  photosList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  photoInfo: {
    flex: 1,
  },
  photoSize: {
    color: colors.caption,
  },
  caption: {
    color: colors.caption,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  folderSelection: {
    gap: spacing.sm,
  },
  folderPath: {
    color: colors.caption,
    fontSize: 11,
    wordBreak: 'break-all',
  },
  progressContainer: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  progressText: {
    textAlign: 'center',
    color: colors.caption,
  },
  errorItem: {
    padding: spacing.sm,
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  errorFile: {
    fontWeight: '600',
    color: colors.danger,
  },
  errorMessage: {
    color: colors.caption,
  },
  successMessage: {
    color: colors.success,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
