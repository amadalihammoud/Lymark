import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import {
  ADDRESS_LINE_HEIGHT_RATIO,
  BRAND_SIZE_RATIO,
  RULE_SPACE_AFTER_RATIO,
  RULE_SPACE_BEFORE_RATIO,
  SCALE_METRICS,
  SIDE_CODE_ANCHOR_RATIO,
  SIDE_CODE_CENTER_RATIO,
  SIDE_CODE_INSET,
  SIDE_CODE_SIZE_RATIO,
  TIME_INK_HEIGHT_RATIO,
  TIME_INK_TOP_RATIO,
  resolveAnchorStyle,
  resolveBrandAnchorStyle,
  resolveTextAlign,
  scaleMetricsToFrame,
} from './layout';

/**
 * O carimbo desenhado sobre a foto.
 *
 * São **três blocos independentes**, não um:
 *
 * 1. **Dados** — hora, data, dia da semana, endereço. Ancorado num canto:
 *
 *        21:25 ┃ 01 ago. 2026
 *              ┃ Sáb
 *        Avenida Senador Pinheiro Machado,
 *        1024, José Menino, Santos - SP
 *
 * 2. **Marca do app** — noutro canto, à escolha de quem usa.
 * 3. **Código de Foto** — girado na lateral direita, ou junto aos dados.
 *
 * O mesmo componente serve para o preview na tela e para a imagem final
 * capturada pelo `view-shot`: o que o usuário vê é literalmente o que é
 * exportado.
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
  if (content.isEmpty && !preferences.showBrand) return null;

  const metrics = scaleMetricsToFrame(SCALE_METRICS[preferences.scale], frameHeight);
  const textAlign = resolveTextAlign(preferences.position);
  const alignItems = textAlign === 'left' ? 'flex-start' : 'flex-end';

  const hasHeader = content.time !== null || content.date !== null || content.weekday !== null;
  const codeInBlock = content.code !== null && preferences.codePlacement === 'block';
  const codeOnSide = content.code !== null && preferences.codePlacement === 'side';
  const hasBlock = hasHeader || content.address !== null || codeInBlock;

  /**
   * Faixa ocupada pelos dígitos dentro da caixa de texto da hora.
   *
   * A barra âmbar e o bloco de data se alinham à **tinta**, não à caixa: na
   * referência os dois começam no topo dos dígitos e terminam na base deles.
   */
  const inkAlignment = content.time
    ? {
        marginTop: Math.round(metrics.time * TIME_INK_TOP_RATIO),
        height: Math.round(metrics.time * TIME_INK_HEIGHT_RATIO),
      }
    : null;

  return (
    <>
      {hasBlock ? (
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
                    style={[
                      styles.text,
                      styles.time,
                      // `lineHeight` explícito é o que torna as proporções de
                      // tinta previsíveis: elas foram medidas nesta condição.
                      { fontSize: metrics.time, lineHeight: metrics.time },
                    ]}>
                    {content.time}
                  </Text>
                ) : null}

                {content.showRule ? (
                  <View
                    style={[
                      styles.rule,
                      inkAlignment,
                      {
                        marginLeft: Math.round(metrics.time * RULE_SPACE_BEFORE_RATIO),
                        marginRight: Math.round(metrics.time * RULE_SPACE_AFTER_RATIO),
                      },
                    ]}
                  />
                ) : null}

                {content.date || content.weekday ? (
                  <View style={[styles.secondaryStack, inkAlignment]}>
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

            {codeInBlock ? (
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
      ) : null}

      {preferences.showBrand ? (
        <View style={resolveBrandAnchorStyle(preferences.brandPosition)} pointerEvents="none">
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.text,
              styles.brand,
              {
              fontSize: Math.round(metrics.address * BRAND_SIZE_RATIO),
              // Caixa de linha colada nos glifos, para a margem superior ser
              // a que a âncora define e não a que a fonte reserva.
              lineHeight: Math.round(metrics.address * BRAND_SIZE_RATIO),
            },
            ]}>
            Ly<Text style={styles.brandAccent}>mark</Text>
          </Text>
        </View>
      ) : null}

      {codeOnSide ? (
        <View
          style={[
            styles.sideAnchor,
            // Largura própria e estreita: o texto é largo *antes* de girar, e
            // sem esta caixa ele se centralizaria na foto inteira em vez de
            // na borda. O giro acontece em torno do centro da âncora.
            {
              width: Math.round(
                metrics.code * SIDE_CODE_SIZE_RATIO * SIDE_CODE_ANCHOR_RATIO,
              ),
            },
          ]}
          pointerEvents="none">
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.text,
              styles.sideCode,
              {
                fontSize: Math.round(metrics.code * SIDE_CODE_SIZE_RATIO),
                // O comprimento do texto girado corre ao longo da altura da
                // foto; sem largura explícita ele seria espremido pela
                // âncora, que é estreita.
                width: frameHeight > 0 ? frameHeight : 240,
              },
            ]}>
            {content.code}
          </Text>
        </View>
      ) : null}
    </>
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
    // Distribui as duas linhas na altura dos dígitos: data encostada no topo,
    // dia da semana na base. É essa distribuição que reproduz a referência.
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
  },
  brand: {
    fontFamily: fontFamily.stampCode,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  brandAccent: {
    color: colors.accent,
  },
  sideAnchor: {
    position: 'absolute',
    right: SIDE_CODE_INSET,
    top: 0,
    // Altura recortada para o centro do texto cair a 38% da foto, como na
    // referência — e não na metade.
    height: `${SIDE_CODE_CENTER_RATIO * 200}%`,
    alignItems: 'center',
    justifyContent: 'center',
    // `overflow` visível de propósito: o texto extrapola a âncora antes do
    // giro, e é isso que permite que ele corra ao longo da altura da foto.
    overflow: 'visible',
  },
  sideCode: {
    fontFamily: fontFamily.stampCode,
    letterSpacing: 1,
    textAlign: 'center',
    // Lê de baixo para cima, como na referência.
    transform: [{ rotate: '-90deg' }],
  },
});
