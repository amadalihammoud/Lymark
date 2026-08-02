import { Image } from 'expo-image';
import { type Ref, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WatermarkOverlay } from '@/features/watermark/watermark-overlay';
import { colors, radius, typography } from '@/theme';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

/**
 * A foto com a marca d'água por cima — e o alvo da exportação.
 *
 * A moldura arredondada é a **externa**; o `ref` aponta para a view interna,
 * de cantos retos. A distinção não é estética: JPEG não tem canal alfa, e
 * capturar uma view com `borderRadius` deixaria quatro cunhas pretas nos
 * cantos de toda foto exportada.
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
  /**
   * Altura real da foto na tela, usada para escalar o carimbo.
   *
   * Sem isso, o bloco tem altura fixa em pontos: numa panorâmica o frame fica
   * com 70 px de altura, o carimbo com 160, e a hora é cortada para fora da
   * imagem — no preview e no arquivo exportado.
   */
  const [frameHeight, setFrameHeight] = useState(0);

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
    <View
      style={[styles.frame, { aspectRatio }]}
      onLayout={(event) => setFrameHeight(event.nativeEvent.layout.height)}>
      <View ref={ref} collapsable={false} style={styles.captured}>
        <Image
          source={{ uri: photo.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Pré-visualização da foto com marca d’água"
        />
        <WatermarkOverlay
          metadata={metadata}
          preferences={preferences}
          frameHeight={frameHeight}
        />
      </View>
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
  /** Cantos retos: é esta view que vira o JPEG. */
  captured: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
