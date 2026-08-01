import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * A marca do app: um selo amarelo com o "L" e o nome ao lado.
 *
 * Desenhada em views, não em imagem — acompanha o tema, escala com a
 * tipografia do sistema e não depende de asset em resolução fixa.
 */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const badgeSize = size === 'sm' ? 28 : 36;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          { width: badgeSize, height: badgeSize, borderRadius: radius.sm },
        ]}>
        <Text style={[styles.badgeLetter, { fontSize: badgeSize * 0.62 }]}>L</Text>
      </View>

      <Text style={[typography.wordmark, size === 'sm' && styles.compactName]}>
        Ly<Text style={styles.nameAccent}>mark</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    color: colors.onAccent,
    fontWeight: '900',
  },
  compactName: {
    fontSize: 18,
  },
  nameAccent: {
    color: colors.accent,
  },
});
