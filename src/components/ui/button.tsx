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
  /**
   * Esconde o texto e deixa só o ícone, num alvo quadrado.
   *
   * O `label` continua sendo o nome acessível: quem usa leitor de tela ouve
   * "Localizar endereço", e não "botão".
   */
  iconOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Um acento só (Onda A da auditoria): o azul-médio saiu dos botões. O âmbar
 * fica reservado à ação principal (`accent`); todo o resto é navy com borda
 * — a mesma hierarquia da landing, onde um único botão é âmbar por tela.
 */
const BACKGROUNDS: Record<ButtonVariant, string> = {
  primary: colors.surfaceRaised,
  primaryAlt: colors.surface,
  accent: colors.accent,
  ghost: 'transparent',
  danger: 'transparent',
};

const PRESSED_BACKGROUNDS: Record<ButtonVariant, string> = {
  primary: colors.surface,
  primaryAlt: colors.surfaceRaised,
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
  iconOnly = false,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  // Desabilitado não é "a mesma cor, apagada": o âmbar a meia-opacidade
  // virava um mostarda que parecia erro de cor. Estado desabilitado é navy
  // com texto apagado, em qualquer variante — a cor só existe quando a ação
  // existe.
  const foreground = disabled ? colors.textSubtle : FOREGROUNDS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        iconOnly && styles.square,
        variant !== 'accent' ? styles.bordered : null,
        { backgroundColor: pressed ? PRESSED_BACKGROUNDS[variant] : BACKGROUNDS[variant] },
        disabled && styles.disabled,
        loading && styles.inactive,
        style,
      ]}>
      {/* O indicador ocupa o lugar do ÍCONE, não o do rótulo. Substituir o
          texto inteiro escondia o que ele diz enquanto espera — e é
          justamente aí que o rótulo carrega o progresso ("Processando… 42%")
          numa exportação de vídeo que leva minutos. */}
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={iconOnly ? 22 : 18} color={foreground} />
      ) : null}
      {iconOnly || (loading && !icon && !label) ? null : (
        <Text style={[typography.button, { color: foreground }]} numberOfLines={1}>
          {label}
        </Text>
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
  /**
   * Alvo quadrado, do tamanho mínimo de toque.
   *
   * Ao lado de uma caixa que cresce até três linhas, um botão em pílula larga
   * deixa um vão à direita que desequilibra a composição.
   */
  square: {
    width: HIT_TARGET + 8,
    height: HIT_TARGET + 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.borderInteractive,
  },
  inactive: {
    opacity: 0.45,
  },
  disabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
