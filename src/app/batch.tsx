/**
 * Tela de processamento em lote para desktop.
 *
 * Conforme decisão 2.4: o processamento em lote é a justificativa de existência do desktop.
 * Esta tela só está disponível no desktop (window.lymark.platform === 'desktop').
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { FieldRow } from '@/components/ui/field-row';
import { useFeedback } from '@/contexts/feedback-context';
import { colors, radius, spacing, typography } from '@/theme';
import { useBatchProcessing } from '@/hooks/use-batch-processing';
import { isDesktop } from '@/lib/file-storage';
import type { WatermarkFieldKey } from '@/types';

/**
 * Os campos que o lote compartilha entre todas as fotos.
 *
 * A marca da empresa NÃO entra aqui: ela vive nas preferências
 * (`brandParts`), é configurada uma vez em Ajustes e já se aplica a toda
 * exportação. Data e hora também ficam de fora — cada foto usa a sua, lida
 * do EXIF, que é justamente o que dá sentido ao lote.
 */
const WATERMARK_FIELDS: WatermarkFieldKey[] = ['code', 'address'];

/*
 * O rótulo de cada campo vem de `app.watermark.fields`, que é o mesmo do
 * formulário de captura, e o exemplo de preenchimento de `app.batch`. Um
 * segundo conjunto de rótulos aqui faria a mesma coisa ter dois nomes dentro
 * do aplicativo.
 */

export default function BatchProcessingScreen() {
  const t = useTranslations('app.batch');
  const tApp = useTranslations('app');
  const { state, metadata, outputFolder, updateMetadata, setOutputFolderPath, startBatch, cancelBatch, loadOutputFolder } = useBatchProcessing();
  const [photos, setPhotos] = useState<{ uri: string; width: number; height: number }[]>([]);
  const { notify } = useFeedback();

  // A recusa por plataforma fica DEPOIS de todos os hooks. Antes, o `return`
  // vinha acima dos dois `useEffect` abaixo: chamada condicional de hook, que
  // viola as regras do React e quebraria a ordem se a condição mudasse.
  const disponivel = isDesktop();

  // Carregar pasta de saída ao montar o componente
  useEffect(() => {
    if (!disponivel) return;
    loadOutputFolder();
  }, [disponivel, loadOutputFolder]);

  // Arrastar fotos para a janela acrescenta ao lote. A escuta é cancelada ao
  // sair da tela — senão cada visita deixaria um ouvinte de `drop` vivo.
  useEffect(() => {
    const unsubscribe = globalThis.window?.lymark?.onDragDrop?.((photo) => {
      if (photo) {
        setPhotos((prev) => [...prev, photo]);
      }
    });
    return () => unsubscribe?.();
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
      // `alert` é global do navegador e não existe no React Native; o app tem
      // aviso próprio, que é o mesmo em toda plataforma.
      notify(t('noPhotos'), 'warning');
      return;
    }
    startBatch(photos);
  }, [notify, photos, startBatch]);

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

  if (!disponivel) {
    return (
      <Screen>
        <Text style={typography.screenTitle}>{t('unavailableTitle')}</Text>
        <Text style={typography.body}>{t('unavailableBody')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <Text style={[typography.screenTitle, styles.title]}>{tApp('nav.batch')}</Text>

      <Section title={t('photosSection')}>
        <Text style={typography.caption}>{t('selected', { count: photos.length })}</Text>
        
        <View style={styles.actions}>
          <Button
            label={t('selectPhotos')}
            icon="image-outline"
            onPress={handleSelectPhotos}
          />
          <Button
            label={t('clearList')}
            icon="trash-outline"
            variant="danger"
            onPress={handleClearPhotos}
            disabled={photos.length === 0}
          />
        </View>

        {/* Área de drag and drop */}
        <View style={styles.dropZone}>
          <Text style={[typography.caption, styles.dropZoneText]}>{t('dropZone')}</Text>
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
                  label={tApp('photo.remove')}
                  icon="close"
                  variant="ghost"
                  onPress={() => handleRemovePhoto(index)}
                />
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title={t('sharedSection')}>
        <Text style={[typography.caption, styles.caption]}>{t('sharedNote')}</Text>

        {WATERMARK_FIELDS.map((field) => (
          <FieldRow
            key={field}
            label={tApp(`watermark.fields.${field}`)}
            value={metadata[field]}
            onChangeText={(value: string) => updateMetadata({ [field]: value })}
            placeholder={t(`${field}Hint`)}
            style={styles.input}
          />
        ))}
      </Section>

      <Section title={t('outputSection')}>
        <View style={styles.folderSelection}>
          <Button
            label={
              outputFolder
                ? t('folder', { name: outputFolder.split('/').pop() ?? '' })
                : t('selectFolder')
            }
            icon="folder-open-outline"
            variant="primaryAlt"
            onPress={handleSelectOutputFolder}
          />
          {outputFolder && (
            <Text style={[typography.caption, styles.folderPath]}>
              {outputFolder}
            </Text>
          )}
        </View>
        <Text style={[typography.caption, styles.caption]}>{t('outputNote')}</Text>
      </Section>

      {state.isProcessing ? (
        <Section title={t('processing')}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${state.progress}%` }]} />
            <Text style={styles.progressText}>
              {t('progress', {
                current: state.current,
                total: state.total,
                percent: Math.round(state.progress),
              })}
            </Text>
          </View>
          <Button
            label={tApp('common.cancel')}
            variant="danger"
            onPress={handleCancelProcessing}
            disabled={!state.isProcessing}
          />
        </Section>
      ) : (
        <Button
          label={t('start')}
          icon="play-circle-outline"
          onPress={handleStartProcessing}
          disabled={photos.length === 0}
        />
      )}

      {state.results.failures.length > 0 && (
        <Section title={t('errorsSection')}>
          <Text style={typography.caption}>
            {t('results', { success: state.results.success, failed: state.results.failed })}
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
        <Section title={t('doneSection')}>
          <Text style={[typography.body, styles.successMessage]}>
            {t('done', { count: state.results.success })}
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
    borderColor: colors.textMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    minHeight: 80,
  },
  dropZoneText: {
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  caption: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  folderSelection: {
    gap: spacing.sm,
  },
  folderPath: {
    color: colors.textMuted,
    fontSize: 11,
    // `wordBreak` é propriedade de CSS e não existe no React Native. Caminho
    // longo já quebra sozinho dentro da largura disponível.
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
    color: colors.textMuted,
  },
  errorItem: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  errorFile: {
    fontWeight: '600',
    color: colors.danger,
  },
  errorMessage: {
    color: colors.textMuted,
  },
  successMessage: {
    color: colors.success,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
