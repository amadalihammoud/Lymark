/**
 * Tela de processamento em lote para desktop.
 *
 * Conforme decisão 2.4: o processamento em lote é a justificativa de existência do desktop.
 * Esta tela só está disponível no desktop (window.lymark.platform === 'desktop').
 */

import { useCallback, useState } from 'react';
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
  const { state, metadata, updateMetadata, startBatch } = useBatchProcessing();
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

  // Handler para arrastar e soltar (será conectado ao Electron IPC)
  const handleDrop = useCallback((files: { uri: string; width: number; height: number }[]) => {
    setPhotos(files);
  }, []);

  // Handler para selecionar pasta de saída
  const handleSelectOutputFolder = useCallback(async () => {
    // Será implementado via IPC
    // Por enquanto, apenas log
    console.log('Selecionar pasta de saída');
  }, []);

  // Handler para iniciar processamento
  const handleStartProcessing = useCallback(() => {
    if (photos.length === 0) {
      alert('Selecione pelo menos uma foto');
      return;
    }
    startBatch(photos);
  }, [photos, startBatch]);

  // Handler para selecionar fotos
  const handleSelectPhotos = useCallback(async () => {
    if (typeof window !== 'undefined' && window.lymark?.pickImages) {
      const result = await window.lymark.pickImages();
      if (result.status === 'selected' && result.photos) {
        setPhotos(result.photos);
      }
    }
  }, []);

  return (
    <Screen scrollable={false}>
      <Text style={[typography.heading, styles.title]}>Processamento em Lote</Text>

      <Section title="Fotos para processar">
        <Text style={typography.caption}>
          {photos.length} fotos selecionadas
        </Text>
        
        <View style={styles.actions}>
          <Button
            label="Selecionar Fotos"
            icon="image-outline"
            onPress={handleSelectPhotos}
          />
          <Button
            label="Arrastar e Soltar"
            icon="folder-outline"
            variant="secondary"
            onPress={() => console.log('Arrastar e soltar ativo')}
          />
        </View>

        {photos.length > 0 && (
          <View style={styles.photosList}>
            {photos.slice(0, 5).map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                <Text style={typography.caption}>
                  {photo.uri.split('/').pop()}
                </Text>
                <Text style={[typography.caption, styles.photoSize]}>
                  {photo.width}x{photo.height}
                </Text>
              </View>
            ))}
            {photos.length > 5 && (
              <Text style={[typography.caption, styles.morePhotos]}>
                +{photos.length - 5} fotos a mais
              </Text>
            )}
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
        <Button
          label="Selecionar Pasta de Saída"
          icon="folder-open-outline"
          variant="secondary"
          onPress={handleSelectOutputFolder}
        />
        <Text style={[typography.caption, styles.caption]}>
          As fotos processadas serão salvas na pasta selecionada.
        </Text>
      </Section>

      {state.isProcessing ? (
        <Section title="Processando...">
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${state.progress}%` }]} />
            <Text style={styles.progressText}>
              {state.current} de {state.total} ({Math.round(state.progress)}%)
            </Text>
          </View>
          <Button
            label="Cancelar"
            variant="danger"
            onPress={() => {}}
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
  photosList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  photoSize: {
    color: colors.caption,
  },
  morePhotos: {
    color: colors.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  caption: {
    color: colors.caption,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
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
});
