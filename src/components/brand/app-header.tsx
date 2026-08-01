import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Wordmark } from './wordmark';

/**
 * Cabeçalho da tela principal.
 *
 * Cumpre um requisito explícito do produto: a identidade do Lymark precisa
 * estar visível em Capturar, e não apenas no ícone do aparelho.
 */
export function AppHeader({ tagline }: { tagline?: string }) {
  return (
    <View style={styles.container}>
      <Wordmark />
      {tagline ? <Text style={typography.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
});
