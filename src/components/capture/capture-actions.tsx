import { StyleSheet, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { spacing } from '@/theme';

/**
 * As portas de entrada da tela de captura.
 *
 * No celular são três — tirar foto, escolher da galeria, gravar vídeo — e
 * as três têm o mesmo peso: blocos iguais, ícone em cima, rótulo embaixo.
 * A versão anterior deixava o vídeo como um quadrado só de ícone ao lado de
 * dois botões largos, e a linha lia como "duas ações e um detalhe". Não é:
 * são três caminhos para a mesma mesa.
 *
 * Fora do celular (sem câmera, ou sem o vídeo na tela inicial) sobram um
 * ou dois botões, e aí a linha volta ao formato de sempre.
 */
export function CaptureActions({
  onTakePhoto,
  onPickFromLibrary,
  onRecordVideo,
  busy = false,
  showCamera = true,
}: {
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  /** Ausente onde o vídeo não passa pela tela inicial (web, desktop). */
  onRecordVideo?: () => void;
  busy?: boolean;
  showCamera?: boolean;
}) {
  const t = useTranslations('app');
  const stacked = showCamera && Boolean(onRecordVideo);

  return (
    <View style={styles.row}>
      {showCamera ? (
        <Button
          label={t('capture.camera')}
          icon="camera"
          variant="primary"
          stacked={stacked}
          onPress={onTakePhoto}
          disabled={busy}
          style={styles.action}
        />
      ) : null}
      <Button
        label={showCamera ? t('capture.gallery') : t('capture.pickPhoto')}
        icon="images"
        variant="primaryAlt"
        stacked={stacked}
        onPress={onPickFromLibrary}
        disabled={busy}
        style={styles.action}
      />
      {stacked && onRecordVideo ? (
        <Button
          label={t('video.record')}
          icon="videocam"
          variant="primaryAlt"
          stacked
          onPress={onRecordVideo}
          disabled={busy}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
