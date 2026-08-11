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

/**
 * A mesma identidade, como barra que atravessa a janela inteira.
 *
 * Na tela larga o cabeçalho não pertence mais a uma tela: ele encima todas, e
 * fica acima das abas. Enquanto morava dentro da coluna de Capturar, aparecia
 * espremido num canto e denunciava o que a tela era — um layout de telefone
 * esticado.
 *
 * Aqui a marca e a linha de apoio ficam lado a lado, e não empilhadas: numa
 * barra baixa e larga, empilhar desperdiça altura que é justamente o que falta.
 */
export function AppBar({ tagline }: { tagline?: string }) {
  return (
    <View style={styles.bar}>
      <Wordmark />
      {tagline ? <Text style={[typography.tagline, styles.barTagline]}>{tagline}</Text> : null}
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
  bar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.tabBar,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarBorder,
  },
  barTagline: {
    // Some antes de a marca começar a ser espremida.
    flexShrink: 1,
  },
});
