import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_TARGET, colors, spacing, typography } from '@/theme';

/**
 * Linha de lista que leva a outra tela.
 *
 * É o tijolo da aba Configurações: ícone, título, um resumo do estado atual
 * à direita e a seta de navegação.
 */
export function NavRow({
  icon,
  title,
  description,
  value,
  onPress,
  showDivider = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Resumo do estado atual, exibido antes da seta. */
  value?: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        pressed && styles.pressed,
      ]}>
      <View style={styles.iconSlot}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>

      <View style={styles.labels}>
        <Text style={typography.value}>{title}</Text>
        {description ? (
          <Text style={typography.caption} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={[typography.caption, styles.value]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
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
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  value: {
    maxWidth: 120,
    textAlign: 'right',
    color: colors.textMuted,
  },
});
