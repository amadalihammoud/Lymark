import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

/**
 * A nota com régua lateral — a linguagem de aviso da landing, agora no app.
 *
 * Um texto solto no meio da tela parece erro; a régua âmbar diz "isto é uma
 * observação do produto" antes de a primeira palavra ser lida. `tone`
 * troca a régua para o vermelho quando o aviso é impeditivo (cota esgotada),
 * sem mudar a gramática visual.
 */
export function Note({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'critical';
}) {
  return (
    <View style={[styles.container, tone === 'critical' && styles.critical]}>
      <Text style={[typography.caption, styles.text]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  critical: {
    borderLeftColor: colors.danger,
  },
  text: {
    color: colors.textMuted,
  },
});
