import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

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

/** Proporção usada enquanto nenhuma foto foi escolhida, fora do modo limitado. */
const PLACEHOLDER_ASPECT_RATIO = 3 / 4;

/**
 * A forma da área reservada à foto, no layout de colunas.
 *
 * Quadrada por medida, não por gosto. Com área fixa e foto nunca cortada, toda
 * imagem cuja forma difere da área precisa sobrar margem — não há terceira
 * via. Resta escolher a forma que desperdiça menos, e o quadrado é a única que
 * trata as duas orientações igual:
 *
 *   área      deitada 4:3   em pé 3:4   16:9   9:16   pior caso
 *   4:3            100%          56%     75%    42%         42%
 *   16:10           83%          47%     90%    35%         35%
 *   1:1             75%          75%     56%    56%         56%
 *
 * Uma área deitada parece melhor até chegar a primeira foto de celular em pé,
 * que é metade do uso de um aplicativo de campo. O quadrado nunca é o melhor
 * caso e nunca é o pior.
 *
 * Sendo mais baixo que a coluna, também garante altura livre embaixo para os
 * botões — e para o que vier depois deles.
 */
const RESERVED_ASPECT_RATIO = 1;

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
  const t = useTranslations('app');
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

  // Duas contas puras a partir de uma medição só: primeiro o retângulo
  // reservado, que não depende da foto e por isso não muda quando ela troca;
  // depois a foto encaixada dentro dele, inteira.
  const reserved = fitInside(box, RESERVED_ASPECT_RATIO);

  const frame = bounded
    ? fitInside(reserved, aspectRatio)
    : { width: box.width, height: box.width > 0 ? box.width / aspectRatio : 0 };

  const stampedPhoto = photo ? (
    <View style={[styles.frame, frame]}>
      <Image
        source={{ uri: photo.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={t('capture.previewLabel')}
      />
      <StampCanvas
        metadata={metadata}
        preferences={preferences}
        width={frame.width}
        height={frame.height}
      />
    </View>
  ) : null;

  /*
   * No modo limitado a área reservada é que é fixa, e a foto se encaixa dentro
   * dela. Antes era o contrário: o quadro ERA o espaço, então trocar de estado
   * mudava o tamanho do bloco — o marcador usa proporção retrato e ocupava a
   * coluna quase toda, enquanto uma foto deitada encolhia e abria um vão. Os
   * botões abaixo pareciam se mexer sozinhos.
   *
   * Com a área fixa, o retângulo é o mesmo com ou sem foto, e o que sobra vira
   * moldura em volta da imagem em vez de espaço morto entre ela e os botões.
   * Acrescentar qualquer coisa abaixo passa a apenas reduzir a área da foto.
   */
  if (bounded) {
    return (
      <View style={styles.fitArea} onLayout={measure}>
        <View style={[styles.reservedArea, reserved]}>
          {stampedPhoto ?? <Text style={typography.body}>{t('capture.noPhotoSelected')}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullWidth} onLayout={measure}>
      {stampedPhoto ?? (
        <View style={[styles.frame, styles.placeholder, frame]}>
          <Text style={typography.body}>{t('capture.noPhotoSelected')}</Text>
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
   * O retângulo reservado à foto, visível mesmo vazio.
   *
   * É ele que dá estabilidade: sendo desenhado, o bloco tem o mesmo tamanho
   * com e sem foto, e a sobra de uma imagem deitada se lê como moldura, não
   * como buraco.
   */
  reservedArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
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
