import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { FieldRow } from '@/components/ui/field-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useCapture } from '@/contexts/capture-context';
import { useSettings } from '@/contexts/settings-context';
import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { BRAND_PART_MAX_LENGTH } from '@/features/watermark/preferences';
import { colors, radius, spacing, typography } from '@/theme';
import {
  BRAND_MODES,
  BRAND_MODE_LABELS,
  CODE_PLACEMENTS,
  CODE_PLACEMENT_LABELS,
  WATERMARK_FIELD_KEYS,
  WATERMARK_FIELD_LABELS,
  WATERMARK_POSITIONS,
  WATERMARK_POSITION_LABELS,
  WATERMARK_SCALES,
  WATERMARK_SCALE_LABELS,
  STAMP_COLOR_KEYS,
  STAMP_COLOR_LABELS,
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
    setShowBrand,
    setBrandPosition,
    setBrandMode,
    setBrandPart,
    setCodePlacement,
    resetPreferences,
  } = useSettings();
  const { draft } = useCapture();
  const [previewFrame, setPreviewFrame] = useState({ width: 0, height: 0 });

  return (
    <Screen>
      <Section
        title="Pré-visualização"
        description={
          draft.photo
            ? 'Sobre a foto atual da aba Capturar.'
            : 'Escolha uma foto em Capturar para ver sobre a imagem real.'
        }>
        <View
          style={styles.preview}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setPreviewFrame((current) =>
              current.width === width && current.height === height ? current : { width, height },
            );
          }}>
          {draft.photo ? (
            <Image
              source={{ uri: draft.photo.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
          <StampCanvas
            metadata={draft.metadata}
            preferences={preferences}
            width={previewFrame.width}
            height={previewFrame.height}
          />
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

      <Section
        title="Código de Foto"
        description="Na lateral ele não disputa espaço com o conteúdo da imagem.">
        <ChoiceGrid
          columns={2}
          selected={preferences.codePlacement}
          onSelect={setCodePlacement}
          options={CODE_PLACEMENTS.map((placement) => ({
            value: placement,
            label: CODE_PLACEMENT_LABELS[placement],
          }))}
        />
      </Section>

      <Section
        title="Marca carimbada"
        description="A marca que vai na foto, em canto próprio. Pode ser a da sua empresa.">
        <ToggleRow
          title="Carimbar uma marca"
          description="Desligue para entregar a foto ao cliente sem marca nenhuma."
          value={preferences.showBrand}
          onValueChange={setShowBrand}
        />

        {preferences.showBrand ? (
          <View style={styles.brandBody}>
            <ChoiceGrid
              columns={2}
              selected={preferences.brandMode}
              onSelect={setBrandMode}
              options={BRAND_MODES.map((mode) => ({
                value: mode,
                label: BRAND_MODE_LABELS[mode],
              }))}
            />

            {preferences.brandMode === 'custom' ? (
              <View style={styles.brandBody}>
                {/* Duas partes, e não duas palavras: "Lymark" é uma palavra só
                    em duas cores, e o mesmo vale para "AutoGlass". Coladas —
                    quem quiser espaço entre elas, digita o espaço. */}
                {([0, 1] as const).map((index) => (
                  <View key={index} style={styles.brandBody}>
                    <FieldRow
                      label={index === 0 ? 'Primeira parte' : 'Segunda parte'}
                      value={preferences.brandParts[index].text}
                      onChangeText={(text) => setBrandPart(index, { text })}
                      placeholder={index === 0 ? 'Construtora' : ' Silva'}
                      maxLength={BRAND_PART_MAX_LENGTH}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <ChoiceGrid
                      columns={3}
                      selected={preferences.brandParts[index].color}
                      onSelect={(color) => setBrandPart(index, { color })}
                      options={STAMP_COLOR_KEYS.map((color) => ({
                        value: color,
                        label: STAMP_COLOR_LABELS[color],
                      }))}
                    />
                  </View>
                ))}

                <Text style={typography.caption}>
                  Deixe a segunda parte vazia para uma marca de cor única. Nome comprido tem o
                  corpo reduzido até caber, em vez de ser cortado.
                </Text>
              </View>
            ) : null}

            <ChoiceGrid
              columns={2}
              selected={preferences.brandPosition}
              onSelect={setBrandPosition}
              options={WATERMARK_POSITIONS.map((position) => ({
                value: position,
                label: WATERMARK_POSITION_LABELS[position],
              }))}
            />
          </View>
        ) : null}
      </Section>

      {preferences.showBrand && preferences.brandPosition === preferences.position ? (
        <Text style={styles.conflict}>
          A marca e os dados estão no mesmo canto — vão se sobrepor na foto.
        </Text>
      ) : null}

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
  brandBody: {
    gap: spacing.lg,
  },
  conflict: {
    ...typography.caption,
    color: colors.accent,
    paddingHorizontal: spacing.xs,
  },
});
