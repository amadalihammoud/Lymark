import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useSettings } from '@/contexts/settings-context';
import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { colors, radius, spacing, typography } from '@/theme';
import type { CaptureMetadata, SelectedPhoto, WatermarkPreferences } from '@/types';

import { documentLayout, FOOTER_HEIGHT, RULER_GAP, RULER_HEIGHT } from './document-layout';

/**
 * Proporção do quadro enquanto nenhuma foto foi escolhida.
 *
 * Deitada, e não em pé como na coluna do celular. Aqui não é questão de gosto:
 * com um marcador em pé o quadro fica bem mais estreito que a régua, e o vazio
 * mostra um documento que não se parece com o que virá — a foto de quem
 * trabalha num monitor é deitada na esmagadora maioria das vezes. Com 4:3 o
 * quadro e a régua nascem alinhados, e o vazio passa a ser um ensaio honesto
 * do resultado.
 */
const PLACEHOLDER_ASPECT_RATIO = 4 / 3;

/**
 * O palco: a foto grande num poço neutro, com a régua de dados presa a ela.
 *
 * É o irmão de tela larga do `PhotoPreview`, e não uma variante dele. O
 * `PhotoPreview` reserva uma área QUADRADA, que foi medida para uma coluna
 * (ver a tabela de desperdício no arquivo dele); num palco de 1100x750 esse
 * quadrado devolveria 750x750 e deixaria 350px laterais mortos. Aqui a lei é
 * outra — ocupar o palco todo, descontada a régua —, e por isso o cálculo mora
 * em `document-layout.ts`, testado à parte.
 *
 * O que os dois têm em comum, e não pode divergir, é o princípio: UMA medição
 * só, e o MESMO número indo para o estilo e para o `StampCanvas`. O canvas
 * devolve `null` se receber zero, e o sintoma é foto sem carimbo — sem erro no
 * console.
 */
export function PhotoStage({
  photo,
  metadata,
  preferences,
  ruler,
  footer,
  overlay,
}: {
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  /** A régua de dados, colada embaixo da foto. Altura fixa, ver o cálculo. */
  ruler: ReactNode;
  /** A linha de dicas embaixo da régua. Reservada mesmo quando vazia. */
  footer: ReactNode;
  /** Canto inferior direito do poço — para avisos que seguem a foto. */
  overlay?: ReactNode;
}) {
  // O dedo sobre o logotipo grava direto na preferência — o padrão global.
  const { updateBrandLogo } = useSettings();
  const t = useTranslations('app');

  /**
   * O espaço do poço. É a ÚNICA medição, e a régua nunca reporta de volta:
   * a altura dela é constante de módulo, justamente para que este `setState`
   * não possa ser realimentado pelo próprio layout que ele produz.
   */
  const [box, setBox] = useState({ width: 0, height: 0 });

  const measure = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  // Das dimensões reais da foto, para não recortar nem gerar tarja preta.
  const aspectRatio =
    photo && photo.width > 0 && photo.height > 0
      ? photo.width / photo.height
      : PLACEHOLDER_ASPECT_RATIO;

  const { frame, documentWidth } = documentLayout(box, aspectRatio);
  const hasFrame = frame.width > 0 && frame.height > 0;

  return (
    <View style={styles.well} onLayout={measure}>
      <View style={[styles.document, { width: documentWidth }]}>
        <View style={[styles.frame, frame]}>
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={t('capture.previewLabel')}
            />
          ) : null}

          {/* O carimbo real também no vazio: editar a hora ou ligar um campo
              mexe no que se vê, antes mesmo de haver foto. */}
          {hasFrame ? (
            <StampCanvas
              metadata={metadata}
              preferences={preferences}
              width={frame.width}
              height={frame.height}
              onLogoChange={updateBrandLogo}
            />
          ) : null}

          {photo ? null : (
            <View style={styles.emptyState} pointerEvents="none">
              <Text style={typography.body}>{t('capture.noPhotoSelected')}</Text>
              <Text style={[typography.caption, styles.emptyHint]}>
                {t('capture.noPhotoHint')}
              </Text>
            </View>
          )}
        </View>

        {/* Altura EXATA, não mínima: é a reserva feita no cálculo acima que
            paga por estas duas faixas. Um `minHeight` aqui deixaria a régua
            crescer e o quadro passaria a mentir sobre o espaço que tem. */}
        <View style={styles.ruler}>{ruler}</View>
        <View style={styles.footer}>{footer}</View>
      </View>

      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * O poço.
   *
   * A cadeia `flex: 1` + `minHeight: 0` + `minWidth: 0` é o que impede a falha
   * silenciosa: sem ela a caixa mede zero de altura, o cálculo devolve zeros e
   * a foto aparece sem carimbo, sem nenhum erro.
   */
  well: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    backgroundColor: colors.tabBar,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  document: {
    alignItems: 'center',
    gap: RULER_GAP,
  },
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruler: {
    alignSelf: 'stretch',
    height: RULER_HEIGHT,
  },
  footer: {
    alignSelf: 'stretch',
    height: FOOTER_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyHint: {
    textAlign: 'center',
  },
});
