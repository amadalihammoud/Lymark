import { Image } from 'expo-image';
import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WatermarkOverlay } from '@/features/watermark/watermark-overlay';
import { colors, radius, typography } from '@/theme';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

/**
 * A foto com a marca d'água por cima — e o alvo da exportação.
 *
 * O `ref` aponta para o `View` que envolve imagem + carimbo: é exatamente
 * essa árvore que o `view-shot` achata em JPEG, o que garante que o
 * exportado seja idêntico ao preview.
 */

/** Proporção usada enquanto nenhuma foto foi escolhida. */
const PLACEHOLDER_ASPECT_RATIO = 3 / 4;

export function PhotoPreview({
  photo,
  metadata,
  preferences,
  ref,
}: {
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  ref?: Ref<View>;
}) {
  if (!photo) {
    return (
      <View
        style={[styles.frame, styles.placeholder, { aspectRatio: PLACEHOLDER_ASPECT_RATIO }]}>
        <Text style={typography.body}>Nenhuma foto selecionada</Text>
      </View>
    );
  }

  // A proporção vem das dimensões reais da foto, para não recortar nem gerar
  // tarjas pretas na imagem exportada.
  const aspectRatio =
    photo.width > 0 && photo.height > 0
      ? photo.width / photo.height
      : PLACEHOLDER_ASPECT_RATIO;

  return (
    <View ref={ref} collapsable={false} style={[styles.frame, { aspectRatio }]}>
      <Image
        source={{ uri: photo.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Pré-visualização da foto com marca d’água"
      />
      <WatermarkOverlay metadata={metadata} preferences={preferences} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
