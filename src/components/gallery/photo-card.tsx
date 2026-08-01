import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTimestamp } from '@/lib/datetime';
import { colors, radius, spacing, typography } from '@/theme';
import type { GalleryEntry } from '@/types';

/** Item do histórico: miniatura, quando foi exportada e o código carimbado. */
export function PhotoCard({
  entry,
  onPress,
}: {
  entry: GalleryEntry;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Foto de ${formatTimestamp(entry.exportedAt)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={{ uri: entry.uri }} style={styles.thumbnail} contentFit="cover" />

      <View style={styles.details}>
        <Text style={typography.value} numberOfLines={1}>
          {formatTimestamp(entry.exportedAt)}
        </Text>
        <Text style={typography.caption} numberOfLines={2}>
          {entry.metadata.address || 'Sem endereço registrado'}
        </Text>
        <Text style={[typography.caption, styles.code]} numberOfLines={1}>
          {entry.metadata.code}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  code: {
    color: colors.accent,
    letterSpacing: 0.5,
  },
});
