import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { colors, radius, typography } from '@/theme';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

/**
 * A foto com a marca d'água por cima.
 *
 * Já não é o alvo da exportação: o arquivo é composto sobre o bitmap original,
 * na resolução dele, e não mais fotografando esta tela. O que sobrou aqui é a
 * pré-visualização — desenhada pelo mesmo motor e pela mesma geometria, com
 * uma largura menor.
 */

/** Proporção usada enquanto nenhuma foto foi escolhida. */
const PLACEHOLDER_ASPECT_RATIO = 3 / 4;

export function PhotoPreview({
  photo,
  metadata,
  preferences,
}: {
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
}) {
  /**
   * Tamanho real da foto na tela.
   *
   * O carimbo é proporcional ao quadro: sem medir, o bloco teria tamanho fixo
   * em pontos e numa panorâmica a hora seria cortada para fora da imagem.
   */
  const [frame, setFrame] = useState({ width: 0, height: 0 });

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
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFrame((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}>
      <Image
        source={{ uri: photo.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Pré-visualização da foto com marca d’água"
      />
      <StampCanvas
        metadata={metadata}
        preferences={preferences}
        width={frame.width}
        height={frame.height}
      />
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
