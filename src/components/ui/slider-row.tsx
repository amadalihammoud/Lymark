import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Um valor contínuo escolhido com o dedo.
 *
 * O React Native não traz um controle deslizante, e o pacote da comunidade é
 * uma dependência nativa a mais para resolver duas perguntas — a transparência
 * da faixa e o arredondamento dela. São vinte linhas de responder e uma barra,
 * com o alvo de toque na altura recomendada.
 */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Como o número é lido em voz alta e mostrado ao lado do rótulo. */
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);

  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const at = (x: number) => {
    if (width <= 0) return;

    const ratio = Math.min(1, Math.max(0, x / width));
    const raw = min + ratio * (max - min);
    // O passo evita que a opacidade fique em 0,7314159 — número que ninguém
    // pediu e que polui o arquivo de preferências.
    const stepped = Math.round(raw / step) * step;

    onChange(Math.min(max, Math.max(min, Number(stepped.toFixed(4)))));
  };

  const filled = max > min ? (value - min) / (max - min) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.value}>{format(value)}</Text>
      </View>

      <View
        style={styles.track}
        onLayout={measure}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: format(value) }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => at(event.nativeEvent.locationX)}
        onResponderMove={(event) => at(event.nativeEvent.locationX)}>
        <View style={styles.rail} />
        <View style={[styles.fill, { width: `${filled * 100}%` }]} />
        <View style={[styles.knob, { left: `${filled * 100}%` }]} />
      </View>
    </View>
  );
}

const KNOB = 22;

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: HIT_TARGET,
    justifyContent: 'center',
  },
  rail: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  fill: {
    position: 'absolute',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    marginLeft: -KNOB / 2,
    borderRadius: KNOB / 2,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.onAccent,
  },
});
