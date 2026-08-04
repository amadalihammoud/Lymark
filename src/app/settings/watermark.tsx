import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { ColorField } from '@/components/ui/color-field';
import { FieldRow } from '@/components/ui/field-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { SliderRow } from '@/components/ui/slider-row';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useCapture } from '@/contexts/capture-context';
import { useFeedback } from '@/contexts/feedback-context';
import { useSettings } from '@/contexts/settings-context';
import { persistLogo, resolveLogoUri } from '@/features/watermark/logo-file';
import {
  BRAND_COMPLEMENT_MAX_LENGTH,
  BRAND_PART_MAX_LENGTH,
} from '@/features/watermark/preferences';
import { PreviewBackdrop } from '@/features/watermark/preview-backdrop';
import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { colors, radius, spacing, typography } from '@/theme';
import {
  BACKDROP_STYLES,
  BACKDROP_STYLE_LABELS,
  BRAND_PLACEMENTS,
  BRAND_PLACEMENT_LABELS,
  CODE_PLACEMENTS,
  CODE_PLACEMENT_LABELS,
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
 *
 * O carimbo é **um** modelo com muitos ajustes, e não um catálogo de modelos
 * prontos. Um catálogo obriga a empresa a escolher o que mais se parece com
 * ela; os ajustes deixam-na chegar exatamente na própria identidade — cor da
 * barra, cor do texto, nome, complemento, logotipo e a faixa de fundo.
 */
export default function WatermarkSettingsScreen() {
  const {
    preferences,
    visibleFieldCount,
    toggleField,
    updatePreferences,
    setBrandPart,
    setBrandLogo,
    resetPreferences,
  } = useSettings();
  const { draft } = useCapture();
  const { ask, notify } = useFeedback();
  const [previewFrame, setPreviewFrame] = useState({ width: 0, height: 0 });

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      ask({
        title: 'Acesso às fotos negado',
        message: 'Libere em Configurações › Permissões para escolher o arquivo do logotipo.',
        actions: [{ label: 'Entendi' }],
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    try {
      // A proporção vem do arquivo **já recortado**, e não do que o seletor
      // informou: aparar a margem transparente muda a proporção, e é a do
      // recorte que a geometria precisa conhecer. Ela é lida aqui, e não na
      // hora do desenho, porque o cálculo do layout roda a cada quadro do
      // preview e não pode decodificar imagem.
      const logo = await persistLogo(asset.uri);

      setBrandLogo(logo);
      notify('Logotipo adicionado ao cabeçalho da marca.');
    } catch (error) {
      console.warn('[marca] falha ao guardar o logotipo.', error);
      ask({
        title: 'Não foi possível usar este arquivo',
        message: 'Tente outra imagem. PNG com fundo transparente é o formato que funciona melhor.',
        actions: [{ label: 'Entendi' }],
      });
    }
  };

  const { brandPlacement } = preferences;

  return (
    <Screen>
      <Section
        title="Pré-visualização"
        description={
          draft.photo
            ? 'Sobre a foto atual da aba Capturar.'
            : 'Do claro ao escuro, para você conferir a legibilidade nos dois extremos.'
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
          ) : (
            <PreviewBackdrop width={previewFrame.width} height={previewFrame.height} />
          )}
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
          onSelect={(position) => updatePreferences({ position })}
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
          onSelect={(scale) => updatePreferences({ scale })}
          options={WATERMARK_SCALES.map((scale) => ({
            value: scale,
            label: WATERMARK_SCALE_LABELS[scale],
          }))}
        />
      </Section>

      <Section
        title="Cores do carimbo"
        description="A cor da foto é uma escolha da empresa, e não do aplicativo — mexer aqui não muda as cores da tela.">
        <ColorField
          label="Barra vertical"
          value={preferences.stampAccent}
          onChange={(stampAccent) => updatePreferences({ stampAccent })}
        />
        <ColorField
          label="Texto"
          value={preferences.stampTextColor}
          onChange={(stampTextColor) => updatePreferences({ stampTextColor })}
        />
      </Section>

      <Section
        title="Código de Foto"
        description="Na lateral ele não disputa espaço com o conteúdo da imagem.">
        <ChoiceGrid
          columns={2}
          selected={preferences.codePlacement}
          onSelect={(codePlacement) => updatePreferences({ codePlacement })}
          options={CODE_PLACEMENTS.map((placement) => ({
            value: placement,
            label: CODE_PLACEMENT_LABELS[placement],
          }))}
        />
      </Section>

      <Section
        title="Marca carimbada"
        description="Acima do relógio ela vira assinatura, com logotipo e complemento. Num canto, é uma linha discreta.">
        <ChoiceGrid
          columns={3}
          selected={brandPlacement}
          onSelect={(placement) => updatePreferences({ brandPlacement: placement })}
          options={BRAND_PLACEMENTS.map((placement) => ({
            value: placement,
            label: BRAND_PLACEMENT_LABELS[placement],
          }))}
        />

        {brandPlacement !== 'none' ? (
          <View style={styles.brandBody}>
            {/* Duas partes, e não duas palavras: "Lymark" é uma palavra só em
                duas cores, e o mesmo vale para "AutoGlass". Coladas — quem
                quiser espaço entre elas, digita o espaço.

                Não há mais escolha entre a marca do app e a da empresa: os
                campos vêm preenchidos com Ly + mark e são sempre editáveis.
                O par de botões só adiava a edição, e escondia o que já estava
                digitado. */}
            {([0, 1] as const).map((index) => (
              <View key={index} style={styles.brandBody}>
                <FieldRow
                  label={index === 0 ? 'Primeira parte' : 'Segunda parte'}
                  value={preferences.brandParts[index].text}
                  onChangeText={(text) => setBrandPart(index, { text })}
                  placeholder={index === 0 ? 'Construtora' : ' Silva'}
                  maxLength={BRAND_PART_MAX_LENGTH}
                  // Sem forçar maiúsculas: com elas, "AutoGlass" e
                  // "TecnoSul" seriam impossíveis de digitar — e são
                  // exatamente o caso que a marca em duas partes atende.
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <ColorField
                  label={index === 0 ? 'Cor da primeira parte' : 'Cor da segunda parte'}
                  value={preferences.brandParts[index].color}
                  onChange={(color) => setBrandPart(index, { color })}
                />
              </View>
            ))}

            <Text style={styles.hint}>
              Deixe a segunda parte vazia para uma marca de cor única. Nome comprido tem o corpo
              reduzido até caber, em vez de ser cortado.
            </Text>

            {brandPlacement === 'header' ? (
              <View style={styles.brandBody}>
                <FieldRow
                  label="Complemento"
                  value={preferences.brandComplement}
                  onChangeText={(brandComplement) => updatePreferences({ brandComplement })}
                  placeholder="Vistorias e laudos técnicos"
                  maxLength={BRAND_COMPLEMENT_MAX_LENGTH}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />
                <ColorField
                  label="Cor do complemento"
                  value={preferences.brandComplementColor}
                  onChange={(brandComplementColor) => updatePreferences({ brandComplementColor })}
                />

                <View style={styles.logoRow}>
                  {preferences.brandLogoPath ? (
                    <Image
                      source={{ uri: resolveLogoUri(preferences.brandLogoPath) }}
                      style={styles.logoPreview}
                      contentFit="contain"
                      accessibilityLabel="Logotipo escolhido"
                    />
                  ) : null}

                  <View style={styles.logoActions}>
                    <Button
                      label={preferences.brandLogoPath ? 'Trocar logotipo' : 'Escolher logotipo'}
                      icon="image-outline"
                      variant="ghost"
                      onPress={() => void pickLogo()}
                    />
                    {preferences.brandLogoPath ? (
                      <Button
                        label="Remover"
                        icon="close"
                        variant="ghost"
                        onPress={() => setBrandLogo(null)}
                      />
                    ) : null}
                  </View>
                </View>

                <Text style={styles.hint}>
                  Use PNG com fundo transparente. Um JPG de fundo branco vira um retângulo branco
                  sobre a foto — o formato não guarda transparência, e não há como o aplicativo
                  adivinhar o que é fundo.
                </Text>
                <Text style={styles.hint}>
                  A altura do logotipo acompanha o texto: o topo dele alinha com o topo do nome e a
                  base, com a base do complemento.
                </Text>
              </View>
            ) : (
              <ChoiceGrid
                columns={2}
                selected={preferences.brandPosition}
                onSelect={(brandPosition) => updatePreferences({ brandPosition })}
                options={WATERMARK_POSITIONS.map((position) => ({
                  value: position,
                  label: WATERMARK_POSITION_LABELS[position],
                }))}
              />
            )}
          </View>
        ) : null}
      </Section>

      {brandPlacement === 'corner' && preferences.brandPosition === preferences.position ? (
        <Text style={styles.conflict}>
          A marca e os dados estão no mesmo canto — vão se sobrepor na foto.
        </Text>
      ) : null}

      <Section
        title="Faixa de fundo"
        description="Garante contraste sobre áreas claras da foto. Sem ela, o texto fica direto sobre a imagem, com sombra.">
        <ChoiceGrid
          columns={3}
          selected={preferences.backdropStyle}
          onSelect={(backdropStyle) => updatePreferences({ backdropStyle })}
          options={BACKDROP_STYLES.map((style) => ({
            value: style,
            label: BACKDROP_STYLE_LABELS[style],
          }))}
        />

        {preferences.backdropStyle !== 'none' ? (
          <View style={styles.brandBody}>
            <Text style={styles.hint}>
              {preferences.backdropStyle === 'block'
                ? 'O fundo acompanha o tamanho do texto, com folga em volta.'
                : 'A faixa atravessa a foto de borda a borda e encosta na margem onde o carimbo está ancorado. Sobre cena carregada — obra, pátio, fachada cheia —, ela lê como legenda do documento em vez de adesivo colado por cima.'}
            </Text>
            <ColorField
              label="Cor da faixa"
              value={preferences.backdropColor}
              onChange={(backdropColor) => updatePreferences({ backdropColor })}
            />
            <SliderRow
              label="Transparência"
              value={preferences.backdropOpacity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}% opaca`}
              onChange={(backdropOpacity) => updatePreferences({ backdropOpacity })}
            />
            <SliderRow
              // Na faixa contínua o raio só vale para os cantos virados para
              // dentro da foto; nos que encostam na borda ele abriria um
              // triângulo da imagem.
              label={
                preferences.backdropStyle === 'block'
                  ? 'Cantos arredondados'
                  : 'Cantos de dentro'
              }
              value={preferences.backdropRadius}
              min={0}
              max={24}
              step={1}
              format={(value) => (value === 0 ? 'Retos' : `${value}`)}
              onChange={(backdropRadius) => updatePreferences({ backdropRadius })}
            />
          </View>
        ) : null}
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
  hint: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  logoActions: {
    flex: 1,
    gap: spacing.sm,
  },
  conflict: {
    ...typography.caption,
    color: colors.accent,
    paddingHorizontal: spacing.xs,
  },
});
