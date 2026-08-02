import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Diálogo com o desenho do app.
 *
 * O `Alert` do sistema é uma caixa cinza com um botão verde-água: no meio de
 * uma tela azul-marinho, parece que outro aplicativo tomou a frente. Trocá-lo
 * é uma decisão de identidade, não de gosto.
 *
 * O que o nativo dava de graça e aqui precisa ser explícito:
 *
 * - **Botão voltar do Android** fecha o diálogo, via `onRequestClose`. Sem
 *   isso o usuário fica preso numa tela sem saída aparente.
 * - **Leitor de tela** anuncia como diálogo e ignora o que está atrás, via
 *   `accessibilityViewIsModal`. É o item que mais se esquece, e o único cuja
 *   ausência ninguém percebe até alguém depender dele.
 * - **Toque fora fecha**, mas só quando há uma saída sem consequência — um
 *   diálogo destrutivo exige escolha explícita.
 */

export type DialogAction = {
  label: string;
  onPress?: () => void;
  /** Destaca a ação que confirma. */
  variant?: 'primary' | 'accent' | 'ghost';
  /** Ação que descarta trabalho: nunca é o alvo de um toque distraído. */
  destructive?: boolean;
};

export function Dialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  message?: string;
  /** Uma ação vira um aviso; duas ou mais, uma decisão. */
  actions: DialogAction[];
  onDismiss: () => void;
}) {
  // Fechar por fora equivale a cancelar. Onde cancelar não existe — porque
  // toda opção tem consequência — o gesto é ignorado.
  const dismissible = actions.length === 1 || actions.some((action) => !action.destructive);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <Pressable
        style={styles.scrim}
        onPress={dismissible ? onDismiss : undefined}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={styles.centerer} pointerEvents="box-none">
        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
          accessibilityLabel={message ? `${title}. ${message}` : title}>
          <Text style={typography.sectionTitle}>{title}</Text>
          {message ? <Text style={[typography.body, styles.message]}>{message}</Text> : null}

          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                variant={action.variant ?? (action.destructive ? 'ghost' : 'primary')}
                onPress={() => {
                  onDismiss();
                  action.onPress?.();
                }}
                style={styles.action}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 12, 20, 0.72)',
  },
  centerer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  message: {
    color: colors.textOnSurface,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  action: {
    width: '100%',
  },
});
