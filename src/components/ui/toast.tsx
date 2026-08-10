import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * Aviso discreto na base da tela.
 *
 * Confirmação de sucesso não deve ser um diálogo. "Foto salva" interrompia o
 * fluxo e exigia um toque no OK — e quem está em campo exporta uma foto atrás
 * da outra, então esse toque se repete dezenas de vezes por dia sem informar
 * nada que a pessoa já não soubesse.
 *
 * Diálogo fica para o que exige decisão. Aqui, o aviso aparece, informa e sai
 * sozinho, sem tirar as mãos de quem está trabalhando.
 */

/** Tempo suficiente para ler duas linhas sem atrapalhar a próxima captura. */
const VISIBLE_MS = 2600;
const FADE_MS = 180;

export type ToastMessage = {
  text: string;
  /** Erros ficam em âmbar; o resto, na cor do texto comum. */
  tone?: 'neutral' | 'warning';
};

export function Toast({
  message,
  onHide,
}: {
  message: ToastMessage | null;
  onHide: () => void;
}) {
  // `useAnimatedValue` existe no React Native mas NÃO no react-native-web:
  // o app quebrava na inicialização com "useAnimatedValue is not a function",
  // e a tela ficava em branco. Esta forma é equivalente e funciona nas três
  // plataformas — o valor é criado uma vez e sobrevive aos renders.
  const opacity = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHideRef.current();
      });
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [message, opacity]);

  if (!message) return null;

  return (
    <View
      style={[styles.anchor, { paddingBottom: insets.bottom + spacing.xl }]}
      pointerEvents="none">
      <Animated.View style={[styles.card, { opacity }]}>
        {/*
          `assertive` e não `polite`: o aviso some sozinho, então esperar uma
          pausa na fala do leitor de tela faria a pessoa perdê-lo.
        */}
        <Text
          accessibilityLiveRegion="assertive"
          style={[
            typography.body,
            message.tone === 'warning' ? styles.warning : styles.neutral,
          ]}>
          {message.text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    maxWidth: 520,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  neutral: {
    color: colors.text,
  },
  warning: {
    color: colors.accent,
  },
});
