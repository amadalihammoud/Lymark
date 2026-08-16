import { StyleSheet, Switch, Text, View } from 'react-native';

import { HIT_TARGET, colors, spacing, typography } from '@/theme';

/** Linha com interruptor — liga e desliga um campo da marca d'água. */
export function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  showDivider = true,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.row, showDivider && styles.divider, disabled && styles.disabled]}>
      <View style={styles.labels}>
        <Text style={typography.value}>{title}</Text>
        {description ? <Text style={typography.caption}>{description}</Text> : null}
      </View>

      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        // Ligado = âmbar, desligado = navy. O verde de componente padrão era
        // o detalhe que mais denunciava "app de template" (auditoria, Onda A).
        trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
        thumbColor={value ? colors.background : colors.textMuted}
        ios_backgroundColor={colors.surfaceRaised}
        // Na web o miolo do estado ligado vem de `activeThumbColor`, prop do
        // react-native-web que não existe no tipo — sem ela, o miolo saía no
        // verde padrão por cima do trilho âmbar.
        {...({ activeThumbColor: colors.background } as object)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HIT_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  labels: {
    flex: 1,
    gap: 2,
  },
});
