import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useCapture } from '@/contexts/capture-context';
import { useSettings } from '@/contexts/settings-context';
import { WatermarkOverlay } from '@/features/watermark/watermark-overlay';
import { colors, radius, spacing, typography } from '@/theme';
import {
  WATERMARK_FIELD_KEYS,
  WATERMARK_FIELD_LABELS,
  WATERMARK_POSITIONS,
  WATERMARK_POSITION_LABELS,
  WATERMARK_SCALES,
  WATERMARK_SCALE_LABELS,
} from '@/types';

/**
 * Preferências de marca d'água.
 *
 * A tela abre com uma pré-visualização ao vivo alimentada pelo rascunho de
 * captura atual: mexer num interruptor aqui mostra o efeito sobre a foto que
 * o usuário acabou de escolher, e não sobre um exemplo genérico.
 */
export default function WatermarkSettingsScreen() {
  const {
    preferences,
    visibleFieldCount,
    toggleField,
    setPosition,
    setScale,
    setShowBackdrop,
    resetPreferences,
  } = useSettings();
  const { draft } = useCapture();

  return (
    <Screen>
      <Section
        title="Pré-visualização"
        description={
          draft.photoUri
            ? 'Sobre a foto atual da aba Capturar.'
            : 'Escolha uma foto em Capturar para ver sobre a imagem real.'
        }>
        <View style={styles.preview}>
          {draft.photoUri ? (
            <Image
              source={{ uri: draft.photoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
          <WatermarkOverlay metadata={draft.metadata} preferences={preferences} />
          {visibleFieldCount === 0 ? (
            <Text style={[typography.caption, styles.previewHint]}>
              Nenhum campo selecionado — a foto sai sem marca d’água.
            </Text>
          ) : null}
        </View>
      </Section>

      <Section
        title="Campos exibidos"
        description="Só entram na foto os campos ligados que tiverem conteúdo.">
        {WATERMARK_FIELD_KEYS.map((key, index) => (
          <ToggleRow
            key={key}
            title={WATERMARK_FIELD_LABELS[key]}
            value={preferences.visibleFields[key]}
            onValueChange={() => toggleField(key)}
            showDivider={index < WATERMARK_FIELD_KEYS.length - 1}
          />
        ))}
      </Section>

      <Section title="Posição" description="Canto da foto onde o bloco é ancorado.">
        <ChoiceGrid
          columns={2}
          selected={preferences.position}
          onSelect={setPosition}
          options={WATERMARK_POSITIONS.map((position) => ({
            value: position,
            label: WATERMARK_POSITION_LABELS[position],
          }))}
        />
      </Section>

      <Section title="Tamanho do texto">
        <ChoiceGrid
          columns={3}
          selected={preferences.scale}
          onSelect={setScale}
          options={WATERMARK_SCALES.map((scale) => ({
            value: scale,
            label: WATERMARK_SCALE_LABELS[scale],
          }))}
        />
      </Section>

      <Section title="Legibilidade">
        <ToggleRow
          title="Faixa escura de fundo"
          description="Garante contraste sobre áreas claras da foto."
          value={preferences.showBackdrop}
          onValueChange={setShowBackdrop}
          showDivider={false}
        />
      </Section>

      <Button
        label="Restaurar padrão"
        icon="refresh"
        variant="ghost"
        onPress={resetPreferences}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHint: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
});
