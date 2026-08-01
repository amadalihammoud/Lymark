import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

/**
 * A marca do Lymark: o selo com o "L" branco e a barra âmbar, seguido do nome.
 *
 * O símbolo é desenhado em views, não carregado como imagem — acompanha a
 * escala tipográfica do sistema, fica nítido em qualquer densidade de tela e
 * usa as mesmas cores do design system que geram o ícone do aplicativo.
 */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const badgeSize = size === 'sm' ? 30 : 38;

  return (
    <View style={styles.container}>
      <BrandMark size={badgeSize} />
      <Text style={[typography.wordmark, size === 'sm' && styles.compactName]}>
        Ly<Text style={styles.nameAccent}>mark</Text>
      </Text>
    </View>
  );
}

/** O símbolo isolado, com as proporções do ícone do aplicativo. */
function BrandMark({ size }: { size: number }) {
  const height = size * 0.46;
  const stroke = Math.max(2, height * 0.24);
  const footWidth = height * 0.62;
  const barWidth = Math.max(2, stroke * 0.72);
  const gap = height * 0.2;

  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="image"
      accessibilityLabel="Lymark">
      <View style={{ width: footWidth + gap + barWidth, height }}>
        {/* Haste do "L". */}
        <View
          style={[styles.letter, { left: 0, top: 0, width: stroke, height }]}
        />
        {/* Pé do "L". */}
        <View
          style={[styles.letter, { left: 0, bottom: 0, width: footWidth, height: stroke }]}
        />
        {/* Barra âmbar. */}
        <View style={[styles.bar, { right: 0, top: 0, width: barWidth, height }]} />
      </View>
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
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    position: 'absolute',
    backgroundColor: colors.text,
  },
  bar: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  compactName: {
    fontSize: 18,
  },
  nameAccent: {
    color: colors.accent,
  },
});
