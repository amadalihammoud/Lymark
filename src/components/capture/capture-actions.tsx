import { StyleSheet, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { spacing } from '@/theme';

/** As origens possíveis para a foto, lado a lado. */
export function CaptureActions({
  onTakePhoto,
  onPickFromLibrary,
  busy = false,
  showCamera = true,
}: {
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  busy?: boolean;
  /**
   * Mostra o botão da câmera.
   *
   * Desligado onde não há câmera alcançável — navegador de desktop e Electron.
   * Ali o botão existia e falhava sempre, com uma mensagem que ainda pedia
   * para tentar de novo. Um botão que nunca funciona é pior que a ausência
   * dele: some a origem que não existe, e a galeria ocupa a linha inteira.
   */
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
