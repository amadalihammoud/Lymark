import { Image, type ImageLoadEventData } from 'expo-image';
import { useState, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WatermarkOverlay } from '@/features/watermark/watermark-overlay';
import { colors, radius, typography } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

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
  uri,
  metadata,
  preferences,
  ref,
}: {
  uri: string | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  ref?: Ref<View>;
}) {
  // A proporção acompanha a foto real para não recortar nem gerar tarjas
  // pretas na imagem exportada.
  const [aspectRatio, setAspectRatio] = useState(PLACEHOLDER_ASPECT_RATIO);

  const handleLoad = ({ source }: ImageLoadEventData) => {
    if (!source?.width || !source?.height) return;
    setAspectRatio(source.width / source.height);
  };

  if (!uri) {
    return (
      <View style={[styles.frame, styles.placeholder, { aspectRatio }]}>
        <Text style={typography.body}>Nenhuma foto selecionada</Text>
      </View>
    );
  }

  return (
    <View ref={ref} collapsable={false} style={[styles.frame, { aspectRatio }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onLoad={handleLoad}
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
