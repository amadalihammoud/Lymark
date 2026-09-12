import { StyleSheet, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { spacing } from '@/theme';

/**
 * As portas de entrada da tela de captura.
 *
 * Foto e galeria têm rótulo; gravar vídeo é só o ícone. Três rótulos numa
 * linha de telefone não cabem, e a câmera de vídeo é o ícone mais
 * reconhecível dos três — o nome acessível continua sendo a frase inteira.
 * A galeria já aceita vídeo pela mesma porta da foto, então o botão de
 * gravar é a única porta exclusiva do vídeo.
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
  return (
    <View style={styles.row}>
      {showCamera ? (
        <Button
          label={t('capture.camera')}
          icon="camera"
          variant="primary"
          onPress={onTakePhoto}
          disabled={busy}
          style={styles.action}
        />
      ) : null}
      <Button
        label={showCamera ? t('capture.gallery') : t('capture.pickPhoto')}
        icon="images"
        variant="primaryAlt"
        onPress={onPickFromLibrary}
        disabled={busy}
        style={styles.action}
      />
      {showCamera && onRecordVideo ? (
        <Button
          label={t('video.record')}
          icon="videocam"
          iconOnly
          variant="primaryAlt"
          onPress={onRecordVideo}
          disabled={busy}
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
