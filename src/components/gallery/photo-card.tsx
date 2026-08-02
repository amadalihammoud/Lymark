import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveExportedPhotoUri } from '@/features/watermark/photo-file';
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
  // O arquivo pode ter sumido: limpeza de dados do app, restauração de
  // backup, ou corte pelo teto do histórico.
  const [missing, setMissing] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Foto de ${formatTimestamp(entry.exportedAt)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {missing ? (
        <View style={[styles.thumbnail, styles.missing]}>
          <Text style={styles.missingMark}>!</Text>
        </View>
      ) : (
        <Image
          source={{ uri: resolveExportedPhotoUri(entry.path) }}
          style={styles.thumbnail}
          contentFit="cover"
          recyclingKey={entry.id}
          onError={() => setMissing(true)}
        />
      )}

      <View style={styles.details}>
        <Text style={typography.value} numberOfLines={1}>
          {formatTimestamp(entry.exportedAt)}
        </Text>
        <Text style={typography.caption} numberOfLines={2}>
          {entry.metadata.address || 'Sem endereço registrado'}
        </Text>
        <Text style={[typography.caption, styles.code]} numberOfLines={1}>
          {missing ? 'Imagem não está mais no aparelho' : entry.metadata.code}
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
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingMark: {
    color: colors.danger,
    fontSize: 24,
    fontWeight: '700',
  },
});
