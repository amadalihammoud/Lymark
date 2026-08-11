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

/**
 * O maior retângulo com a proporção pedida que cabe na caixa.
 *
 * O cálculo é feito aqui, e não por CSS, porque `aspectRatio` sozinho resolve
 * a altura a partir da largura e ignora o teto vertical: numa janela larga o
 * quadro passava de mil e seiscentos pixels de altura. Medir e dimensionar é
 * também o que este componente já fazia para o carimbo, que precisa do tamanho
 * em pixels — não é uma engrenagem nova.
 */
function fitInside(box: { width: number; height: number }, aspectRatio: number) {
  if (box.width <= 0 || box.height <= 0) return { width: 0, height: 0 };

  const heightIfFullWidth = box.width / aspectRatio;
  return heightIfFullWidth <= box.height
    ? { width: box.width, height: heightIfFullWidth }
    : { width: box.height * aspectRatio, height: box.height };
}

export function PhotoPreview({
  photo,
  metadata,
  preferences,
  bounded = false,
}: {
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  /**
   * Caber na altura disponível em vez de ocupar a largura toda.
   *
   * Ligado no layout de duas colunas, onde a foto divide a tela com o
   * formulário e não pode empurrá-lo para fora.
   */
  bounded?: boolean;
}) {
  /**
   * Tamanho real da foto na tela.
   *
   * O carimbo é proporcional ao quadro: sem medir, o bloco teria tamanho fixo
   * em pontos e numa panorâmica a hora seria cortada para fora da imagem.
   */
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  /** Espaço que sobrou para o quadro. Só é medido no modo limitado. */
  const [box, setBox] = useState({ width: 0, height: 0 });

  const measure = (
    setter: typeof setFrame,
  ) => (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setter((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  // A proporção vem das dimensões reais da foto, para não recortar nem gerar
  // tarjas pretas na imagem exportada.
  const aspectRatio =
    photo && photo.width > 0 && photo.height > 0
      ? photo.width / photo.height
      : PLACEHOLDER_ASPECT_RATIO;

  const frameSize = bounded ? fitInside(box, aspectRatio) : { width: '100%' as const, aspectRatio };

  const content = !photo ? (
    <View style={[styles.frame, styles.placeholder, frameSize]}>
      <Text style={typography.body}>Nenhuma foto selecionada</Text>
    </View>
  ) : (
    <View style={[styles.frame, frameSize]} onLayout={measure(setFrame)}>
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

  if (!bounded) return content;

  return (
    <View style={styles.fitArea} onLayout={measure(setBox)}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  /** A área que sobra para o quadro, no modo limitado. */
  fitArea: {
    flex: 1,
    // Sem isto, um filho alto impede a coluna de encolher e a foto volta a
    // empurrar o resto da tela para fora.
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
