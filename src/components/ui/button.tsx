// Importado pela família, e não pelo barril `@expo/vector-icons`: o barril
// carrega TODAS as famílias de ícones e some com megabytes no bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Botão do app.
 *
 * As variantes seguem a hierarquia da tela de captura: `primary` para as
 * ações de origem da foto, `accent` para a exportação (a ação final, em
 * amarelo) e `ghost` para ações secundárias dentro de listas.
 */

export type ButtonVariant = 'primary' | 'primaryAlt' | 'accent' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BACKGROUNDS: Record<ButtonVariant, string> = {
  primary: colors.primary,
  primaryAlt: colors.primaryAlt,
  accent: colors.accent,
  ghost: 'transparent',
  danger: 'transparent',
};

const PRESSED_BACKGROUNDS: Record<ButtonVariant, string> = {
  primary: colors.primaryPressed,
  primaryAlt: colors.primary,
  accent: colors.accentPressed,
  ghost: colors.surfaceRaised,
  danger: colors.surfaceRaised,
};

const FOREGROUNDS: Record<ButtonVariant, string> = {
  primary: colors.text,
  primaryAlt: colors.text,
  accent: colors.onAccent,
  ghost: colors.textOnSurface,
  danger: colors.danger,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const foreground = FOREGROUNDS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' || variant === 'danger' ? styles.bordered : null,
        { backgroundColor: pressed ? PRESSED_BACKGROUNDS[variant] : BACKGROUNDS[variant] },
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={[typography.button, { color: foreground }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.borderInteractive,
  },
  inactive: {
    opacity: 0.45,
  },
});
