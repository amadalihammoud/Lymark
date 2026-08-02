import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import {
  ADDRESS_LINE_HEIGHT_RATIO,
  RULE_SPACE_AFTER_RATIO,
  RULE_SPACE_BEFORE_RATIO,
  SCALE_METRICS,
  resolveAnchorStyle,
  resolveTextAlign,
  scaleMetricsToFrame,
} from './layout';

/**
 * O carimbo desenhado sobre a foto.
 *
 * Reproduz o layout de referência:
 *
 *     21:25 ┃ 01 ago. 2026
 *           ┃ Sáb
 *     Avenida Senador Pinheiro Machado,
 *     1024, José Menino, Santos - SP,
 *     11065-605
 *
 * Três detalhes que só aparecem medindo a referência lado a lado:
 *
 * - **O bloco da direita alinha pelo topo**, não pela base. O topo da data
 *   encosta no topo da hora, e a base da hora fica *acima* da base do dia da
 *   semana.
 * - **A barra âmbar percorre a altura inteira do bloco**, do topo da hora até
 *   abaixo do dia da semana — por isso `alignSelf: 'stretch'` em vez de altura
 *   calculada.
 * - **Só a hora é pesada.** Data, dia e endereço são regulares; o contraste
 *   vem do tamanho e do desenho condensado, não do peso.
 *
 * O mesmo componente serve para o preview e para a imagem capturada pelo
 * `view-shot`: o que o usuário vê é literalmente o que é exportado.
 *
 * Todo texto tem `allowFontScaling={false}`. A marca d'água é conteúdo da
 * **imagem**, não interface: sem essa trava, o ajuste de fonte do aparelho
 * vazaria para dentro do arquivo JPEG e dois técnicos exportariam carimbos de
 * tamanhos diferentes para a mesma vistoria.
 */
export function WatermarkOverlay({
  metadata,
  preferences,
  frameHeight = 0,
}: {
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  /** Altura da foto na tela; encolhe o carimbo em fotos baixas e largas. */
  frameHeight?: number;
}) {
  const content = buildWatermarkContent(metadata, preferences);
  if (content.isEmpty) return null;

  const metrics = scaleMetricsToFrame(SCALE_METRICS[preferences.scale], frameHeight);
  const textAlign = resolveTextAlign(preferences.position);
  const alignItems = textAlign === 'left' ? 'flex-start' : 'flex-end';

  const hasHeader = content.time !== null || content.date !== null || content.weekday !== null;

  return (
    <View style={resolveAnchorStyle(preferences.position)} pointerEvents="none">
      <View
        style={[
          {
            alignItems,
            paddingVertical: metrics.paddingVertical,
            paddingHorizontal: metrics.paddingHorizontal,
          },
          preferences.showBackdrop && styles.backdrop,
        ]}>
        {hasHeader ? (
          <View style={styles.header}>
            {content.time ? (
              <Text
                allowFontScaling={false}
                style={[styles.text, styles.time, { fontSize: metrics.time }]}>
                {content.time}
              </Text>
            ) : null}

            {content.showRule ? (
              <View
                style={[
                  styles.rule,
                  {
                    marginLeft: Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO),
                    marginRight: Math.round(metrics.time * RULE_SPACE_AFTER_RATIO),
                  },
                ]}
              />
            ) : null}

            {content.date || content.weekday ? (
              <View style={styles.secondaryStack}>
                {content.date ? (
                  <Text
                    allowFontScaling={false}
                    style={[styles.text, styles.secondary, { fontSize: metrics.secondary }]}>
                    {content.date}
                  </Text>
                ) : null}
                {content.weekday ? (
                  <Text
                    allowFontScaling={false}
                    style={[styles.text, styles.secondary, { fontSize: metrics.secondary }]}>
                    {content.weekday}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {content.address ? (
          <Text
            allowFontScaling={false}
            style={[
              styles.text,
              styles.address,
              {
                fontSize: metrics.address,
                lineHeight: Math.round(metrics.address * ADDRESS_LINE_HEIGHT_RATIO),
                textAlign,
                marginTop: hasHeader ? metrics.gap : 0,
              },
            ]}>
            {content.address}
          </Text>
        ) : null}

        {content.code ? (
          <Text
            allowFontScaling={false}
            style={[
              styles.text,
              styles.code,
              { fontSize: metrics.code, textAlign, marginTop: Math.round(metrics.gap / 2) },
            ]}>
            {content.code}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.watermarkBackdrop,
    borderRadius: radius.sm,
  },
  header: {
    flexDirection: 'row',
    // Topo, não base: é assim que a data encosta no alto da hora.
    alignItems: 'flex-start',
  },
  secondaryStack: {
    alignItems: 'flex-start',
    // Estica até a altura da hora e distribui: data encostada no topo, dia da
    // semana lá embaixo. É essa distribuição que reproduz a referência — sem
    // ela, as duas linhas ficariam grudadas no alto.
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  text: {
    color: colors.text,
    // Sem a faixa de fundo, a sombra é o que mantém o texto legível sobre
    // áreas claras da foto.
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  time: {
    fontFamily: fontFamily.stamp,
    // Encosta o texto na borda da caixa, para o topo casar com a data.
    includeFontPadding: false,
  },
  secondary: {
    fontFamily: fontFamily.stampBody,
    includeFontPadding: false,
  },
  address: {
    fontFamily: fontFamily.stampBody,
  },
  code: {
    fontFamily: fontFamily.stampCode,
    letterSpacing: 0.6,
    // Sem `opacity`: ela esmaeceria texto e sombra juntos, e sobre uma foto
    // clara o código — justamente o campo de rastreio — ficaria invisível.
  },
  rule: {
    width: 2,
    backgroundColor: colors.accent,
    // Percorre a altura inteira do bloco: do topo da hora até abaixo do dia
    // da semana, como na referência.
    alignSelf: 'stretch',
  },
});
