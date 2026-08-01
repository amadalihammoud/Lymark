import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Campo rotulado da tela de captura: rótulo discreto em cima, caixa de
 * entrada embaixo.
 *
 * `trailing` encaixa uma ação à direita da caixa sem quebrar o alinhamento —
 * é como o botão "Gerar" convive com o Código de Foto.
 */
export function FieldRow({
  label,
  trailing,
  style,
  ...inputProps
}: {
  label: string;
  trailing?: ReactNode;
} & TextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, style]}
          {...inputProps}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: HIT_TARGET + 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.value,
  },
});
