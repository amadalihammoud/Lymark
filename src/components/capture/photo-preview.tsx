import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { colors, radius, typography } from '@/theme';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

import { fitInside } from './fit-inside';

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
   * O espaço disponível para o quadro. É a ÚNICA medição do componente.
   *
   * Antes havia duas, em cadeia: media-se a caixa, o quadro recebia tamanho e
   * só então um segundo `onLayout` informava as dimensões ao `StampCanvas`.
   * Quando essa segunda medição não chegava, largura e altura ficavam em zero,
   * o `StampCanvas` devolvia `null` — ele exige as duas maiores que zero — e o
   * resultado era a foto aparecer sem carimbo, sem erro e sem aviso.
   *
   * Agora o tamanho do quadro é calculado, não medido de volta: o mesmo valor
   * que vai para o estilo vai para o carimbo. Some o intervalo em que os dois
   * podiam discordar.
   */
  const [box, setBox] = useState({ width: 0, height: 0 });

  const measure = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  // A proporção vem das dimensões reais da foto, para não recortar nem gerar
  // tarjas pretas na imagem exportada.
  const aspectRatio =
    photo && photo.width > 0 && photo.height > 0
      ? photo.width / photo.height
      : PLACEHOLDER_ASPECT_RATIO;

  // Limitado: o maior retângulo que cabe na caixa. Livre: a largura toda, com a
  // altura saindo da proporção. Nos dois casos o tamanho é conhecido aqui.
  const frame = bounded
    ? fitInside(box, aspectRatio)
    : { width: box.width, height: box.width > 0 ? box.width / aspectRatio : 0 };

  return (
    <View style={bounded ? styles.fitArea : styles.fullWidth} onLayout={measure}>
      {!photo ? (
        <View style={[styles.frame, styles.placeholder, frame]}>
          <Text style={typography.body}>Nenhuma foto selecionada</Text>
        </View>
      ) : (
        <View style={[styles.frame, frame]}>
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
      )}
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
  /**
   * No modo livre a área só serve para medir a largura.
   *
   * `alignSelf: 'stretch'` garante que ela receba a largura do pai mesmo
   * quando o pai centraliza os filhos — sem isso a medição sairia zero e o
   * quadro nunca ganharia tamanho.
   */
  fullWidth: {
    alignSelf: 'stretch',
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
