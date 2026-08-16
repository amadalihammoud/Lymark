import {
  Canvas,
  LinearGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslations } from 'use-intl';

import { hexToHsv, hsvToHex } from '@/lib/color';
import { HIT_TARGET, colors, fontFamily, radius, spacing, typography } from '@/theme';
import { STAMP_COLOR_KEYS, STAMP_COLOR_SWATCHES } from '@/types';

/**
 * Escolha de cor: seis atalhos e, atrás deles, o espectro inteiro.
 *
 * A paleta fechada existia por uma razão de campo — sobre asfalto ou parede
 * clara, metade do espectro simplesmente some. Mas ela também impedia a
 * empresa de carimbar a **própria** cor, que é o ponto de carimbar a própria
 * marca. Os seis atalhos continuam sendo o caminho rápido e resolvem o caso
 * comum em um toque; quem precisa do azul exato do logotipo abre a roda.
 */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const t = useTranslations('app');
  const [picking, setPicking] = useState(false);

  const isSwatch = STAMP_COLOR_KEYS.some((key) => STAMP_COLOR_SWATCHES[key] === value);

  return (
    <View style={styles.field}>
      <Text style={typography.caption}>{label}</Text>

      <View style={styles.swatches}>
        {STAMP_COLOR_KEYS.map((key) => {
          const hex = STAMP_COLOR_SWATCHES[key];
          const selected = hex === value;

          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${t(`watermark.colors.${key}`)}`}
              onPress={() => onChange(hex)}
              style={[styles.swatch, selected && styles.swatchSelected]}>
              <View style={[styles.swatchFill, { backgroundColor: hex }]} />
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !isSwatch }}
          accessibilityLabel={`${label}: ${t('colorPicker.other')}`}
          onPress={() => setPicking(true)}
          style={[styles.swatch, !isSwatch && styles.swatchSelected]}>
          {/* Sem atalho correspondente, o botão da roda mostra a cor em uso —
              é o único lugar onde ela aparece. */}
          <View style={[styles.swatchFill, isSwatch ? styles.wheel : { backgroundColor: value }]}>
            {isSwatch ? <Text style={styles.wheelMark}>+</Text> : null}
          </View>
        </Pressable>
      </View>

      <ColorPickerModal
        visible={picking}
        label={label}
        value={value}
        onClose={() => setPicking(false)}
        onChange={onChange}
      />
    </View>
  );
}

/** Altura da faixa de matiz. O quadrado ocupa o resto. */
const HUE_HEIGHT = 44;
const AREA_HEIGHT = 200;

function ColorPickerModal({
  visible,
  label,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  label: string;
  value: string;
  onClose: () => void;
  onChange: (color: string) => void;
}) {
  // O seletor abre na cor atual, e não no vermelho: a maior parte das vezes o
  // ajuste é um acerto fino do que já está escolhido.
  const t = useTranslations('app');
  const initial = useMemo(() => hexToHsv(value), [value]);
  const [hsv, setHsv] = useState(initial);
  const [size, setSize] = useState(0);

  // Reabrir depois de mudar a cor por um atalho precisa partir do novo valor.
  const [seed, setSeed] = useState(value);
  if (visible && seed !== value) {
    setSeed(value);
    setHsv(initial);
  }

  const hex = hsvToHex(hsv);

  const onArea = (x: number, y: number) => {
    if (size <= 0) return;
    setHsv((current) => ({
      ...current,
      s: Math.min(1, Math.max(0, x / size)),
      // O eixo vertical cresce para baixo e o brilho, para cima.
      v: Math.min(1, Math.max(0, 1 - y / AREA_HEIGHT)),
    }));
  };

  const onHue = (x: number) => {
    if (size <= 0) return;
    setHsv((current) => ({ ...current, h: Math.min(360, Math.max(0, (x / size) * 360)) }));
  };

  const measure = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout.width);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Sem isto o botão físico de voltar do Android fecha o app inteiro em vez
      // do seletor.
      onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={typography.sectionTitle}>{label}</Text>

          <View onLayout={measure} style={styles.area}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Rect x={0} y={0} width={size} height={AREA_HEIGHT}>
                {/* Saturação na horizontal, brilho na vertical: as duas
                    perguntas que sobram depois de escolher o matiz. */}
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(size, 0)}
                  colors={['#FFFFFF', hsvToHex({ h: hsv.h, s: 1, v: 1 })]}
                />
              </Rect>
              <Rect x={0} y={0} width={size} height={AREA_HEIGHT}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, AREA_HEIGHT)}
                  colors={['rgba(0,0,0,0)', '#000000']}
                />
              </Rect>
            </Canvas>

            <View
              style={StyleSheet.absoluteFill}
              accessibilityRole="adjustable"
              accessibilityLabel={t('colorPicker.saturationBrightness')}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) =>
                onArea(event.nativeEvent.locationX, event.nativeEvent.locationY)
              }
              onResponderMove={(event) =>
                onArea(event.nativeEvent.locationX, event.nativeEvent.locationY)
              }
            />

            <View
              pointerEvents="none"
              style={[
                styles.pointer,
                {
                  left: hsv.s * size - POINTER / 2,
                  top: (1 - hsv.v) * AREA_HEIGHT - POINTER / 2,
                },
              ]}
            />
          </View>

          <View style={styles.hue}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Rect x={0} y={0} width={size} height={HUE_HEIGHT}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(size, 0)}
                  colors={[
                    '#FF0000', '#FFFF00', '#00FF00',
                    '#00FFFF', '#0000FF', '#FF00FF', '#FF0000',
                  ]}
                />
              </Rect>
            </Canvas>

            <View
              style={StyleSheet.absoluteFill}
              accessibilityRole="adjustable"
              accessibilityLabel={t('colorPicker.hue')}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => onHue(event.nativeEvent.locationX)}
              onResponderMove={(event) => onHue(event.nativeEvent.locationX)}
            />

            <View
              pointerEvents="none"
              style={[
                styles.pointer,
                { left: (hsv.h / 360) * size - POINTER / 2, top: HUE_HEIGHT / 2 - POINTER / 2 },
              ]}
            />
          </View>

          <View style={styles.result}>
            <View style={[styles.resultChip, { backgroundColor: hex }]} />
            <Text style={typography.value}>{hex}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.action, styles.actionGhost]}>
              <Text style={typography.value}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(hex);
                onClose();
              }}
              style={[styles.action, styles.actionPrimary]}>
              <Text style={[typography.value, styles.actionPrimaryLabel]}>{t('colorPicker.use')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const POINTER = 22;

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderColor: colors.accent,
  },
  swatchFill: {
    width: '78%',
    height: '78%',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    backgroundColor: colors.surfaceRaised,
  },
  wheelMark: {
    ...typography.value,
    fontFamily: fontFamily.uiBold,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  area: {
    height: AREA_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  hue: {
    height: HUE_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pointer: {
    position: 'absolute',
    width: POINTER,
    height: POINTER,
    borderRadius: POINTER / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    // Um anel branco some sobre o canto branco do quadrado; o segundo anel
    // escuro é o que mantém o ponteiro visível em toda a área.
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  actionGhost: {
    backgroundColor: colors.surfaceRaised,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
  },
  actionPrimaryLabel: {
    color: colors.onAccent,
    fontFamily: fontFamily.uiBold,
    fontWeight: '700',
  },
});
