import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from './build-content';
import {
  SCALE_METRICS,
  resolveAnchorStyle,
  resolveTextAlign,
  scaleMetricsToFrame,
} from './layout';

/**
 * O carimbo desenhado sobre a foto.
 *
 * Reproduz o layout de referência do Lymark:
 *
 *     14:38 │ 30 jul. 2026
 *           │ Qui
 *     R. Azuíl Loureiro, 1395 - Vila Santa
 *     Rosa, Guarujá - SP, 11430-111
 *
 * A hora domina, uma barra âmbar — o mesmo traço da marca — separa o bloco
 * de data e dia da semana, e o endereço ocupa a largura embaixo.
 *
 * O mesmo componente serve para o preview na tela e para a imagem final
 * capturada pelo `view-shot`: o que o usuário vê é literalmente o que é
 * exportado.
 *
 * Todo texto tem `allowFontScaling={false}`. Isso é deliberado e vale a
 * explicação: a marca d'água é conteúdo da **imagem**, não interface. Sem
 * essa trava, o ajuste de fonte do aparelho vazaria para dentro do arquivo
 * JPEG, e dois técnicos da mesma equipe exportariam carimbos de tamanhos
 * diferentes para a mesma vistoria. Na interface do app, o oposto: a escala
 * do sistema é respeitada.
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
                  { height: metrics.time * 0.86, marginHorizontal: metrics.secondary },
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
              { fontSize: metrics.address, textAlign, marginTop: hasHeader ? metrics.gap : 0 },
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
    // As bases da hora e do bloco secundário se alinham, como na referência.
    alignItems: 'flex-end',
  },
  secondaryStack: {
    alignItems: 'flex-start',
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
    fontWeight: '700',
    letterSpacing: -0.5,
    // Encosta o texto na base da caixa, para casar com a barra.
    includeFontPadding: false,
  },
  secondary: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  address: {
    fontWeight: '600',
  },
  code: {
    fontWeight: '600',
    letterSpacing: 0.6,
    // Sem `opacity`: ela esmaeceria texto e sombra juntos, e sobre uma foto
    // clara o código — justamente o campo de rastreio — ficaria invisível. A
    // hierarquia já vem do tamanho menor.
  },
  rule: {
    width: 2,
    backgroundColor: colors.accent,
  },
});
