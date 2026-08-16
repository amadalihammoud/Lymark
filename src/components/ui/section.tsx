import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/** Bloco titulado das telas de configuração. */
export function Section({
  title,
  description,
  children,
  padded = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Respiro interno para conteúdo cru (texto, botões). As linhas prontas —
   * `NavRow`, `ToggleRow` — trazem o próprio padding e não precisam disto;
   * sem a distinção, texto e botão colocados direto no cartão saíam colados
   * na borda, como nas telas de vídeo e conta da auditoria.
   */
  padded?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={typography.sectionTitle}>{title}</Text>
      {description ? <Text style={typography.caption}>{description}</Text> : null}
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  body: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
