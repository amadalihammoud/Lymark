import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkLines } from './build-lines';
import { SCALE_METRICS, resolveAnchorStyle, resolveTextAlign } from './layout';

/**
 * O carimbo desenhado sobre a foto.
 *
 * O mesmo componente serve para o preview na tela e para a imagem final
 * capturada pelo `view-shot` — o que o usuário vê é literalmente o que é
 * exportado.
 */
export function WatermarkOverlay({
  metadata,
  preferences,
}: {
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
}) {
  const lines = buildWatermarkLines(metadata, preferences);
  if (lines.length === 0) return null;

  const metrics = SCALE_METRICS[preferences.scale];
  const textAlign = resolveTextAlign(preferences.position);

  return (
    <View style={resolveAnchorStyle(preferences.position)} pointerEvents="none">
      <View
        style={[
          styles.block,
          {
            paddingVertical: metrics.paddingVertical,
            paddingHorizontal: metrics.paddingHorizontal,
          },
          preferences.showBackdrop && styles.backdrop,
        ]}>
        {lines.map((line) => (
          <Text
            key={line}
            style={[
              styles.line,
              {
                fontSize: metrics.fontSize,
                lineHeight: metrics.lineHeight,
                textAlign,
              },
            ]}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radius.sm,
  },
  backdrop: {
    backgroundColor: colors.watermarkBackdrop,
  },
  line: {
    color: colors.text,
    fontWeight: '600',
    // Sem a faixa de fundo, a sombra é o que mantém o texto legível
    // sobre áreas claras da foto.
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
