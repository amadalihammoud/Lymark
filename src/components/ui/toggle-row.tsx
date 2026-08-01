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
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.accent : colors.textMuted}
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
