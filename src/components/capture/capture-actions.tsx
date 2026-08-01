import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { spacing } from '@/theme';

/** As duas origens possíveis para a foto, lado a lado. */
export function CaptureActions({
  onTakePhoto,
  onPickFromLibrary,
  busy = false,
}: {
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  busy?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Button
        label="Tirar foto"
        icon="camera"
        variant="primary"
        onPress={onTakePhoto}
        disabled={busy}
        style={styles.action}
      />
      <Button
        label="Escolher da galeria"
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
