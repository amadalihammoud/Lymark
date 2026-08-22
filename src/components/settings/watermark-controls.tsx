import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { ColorField } from '@/components/ui/color-field';
import { FieldRow } from '@/components/ui/field-row';
import { Section } from '@/components/ui/section';
import { SliderRow } from '@/components/ui/slider-row';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useFeedback } from '@/contexts/feedback-context';
import { useSettings } from '@/contexts/settings-context';
import { persistLogo, resolveLogoUri } from '@/features/watermark/logo-file';
import {
  BRAND_COMPLEMENT_MAX_LENGTH,
  BRAND_LOGO_SCALE_MAX,
  BRAND_LOGO_SCALE_MIN,
  BRAND_PART_MAX_LENGTH,
} from '@/features/watermark/preferences';
import { colors, radius, spacing, typography } from '@/theme';
import {
  BACKDROP_STYLES,
  BRAND_PLACEMENTS,
  CODE_PLACEMENTS,
  TIME_FORMATS,
  WATERMARK_FIELD_KEYS,
  WATERMARK_POSITIONS,
  WATERMARK_SCALES,
} from '@/types';

/**
 * Os controles da marca d'água, sem moldura de tela.
 *
 * Vivia dentro da rota `settings/watermark`. Foi extraído para que a tela larga
 * possa mostrá-lo ao lado da foto: ali o efeito de cada interruptor aparece na
 * pré-visualização real no mesmo instante, em vez de exigir ir a outra aba e
 * voltar para conferir.
 *
 * Não traz pré-visualização própria de propósito. Na rota, quem a fornece é a
 * tela; no layout de três colunas ela seria uma segunda cópia da foto que já
 * está do lado.
 *
 * O carimbo é **um** modelo com muitos ajustes, e não um catálogo de modelos
 * prontos. Um catálogo obriga a empresa a escolher o que mais se parece com
 * ela; os ajustes deixam-na chegar exatamente na própria identidade — cor da
 * barra, cor do texto, nome, complemento, logotipo e a faixa de fundo.
 */
/**
 * Quais campos entram no carimbo.
 *
 * Vive separado porque no layout de três colunas ele não fica com o resto das
 * preferências: vai para a coluna dos DADOS, logo abaixo dos campos. O
 * interruptor de "Hora" ao lado do valor da hora se explica sozinho; a duas
 * colunas de distância, não.
 */
export function WatermarkFieldToggles() {
  const t = useTranslations('app.watermark');
  const { preferences, toggleField } = useSettings();

  return (
    <Section
      title={t('fieldsTitle')}
      description={t('fieldsDescription')}>
      {WATERMARK_FIELD_KEYS.map((key, index) => (
        <ToggleRow
          key={key}
          title={t(`fields.${key}`)}
          value={preferences.visibleFields[key]}
          onValueChange={() => toggleField(key)}
          showDivider={index < WATERMARK_FIELD_KEYS.length - 1}
        />
      ))}
    </Section>
  );
}

/**
 * Onde o código de foto é desenhado.
 *
 * Acompanha `WatermarkFieldToggles` para a coluna dos dados: é a única
 * preferência que fala de um campo específico, e o campo está logo acima.
 */
export function CodePlacementControl() {
  const t = useTranslations('app.watermark');
  const { preferences, updatePreferences } = useSettings();

  return (
    <Section
      title={t('codeTitle')}
      description={t('codeDescription')}>
      <ChoiceGrid
        columns={2}
        selected={preferences.codePlacement}
        onSelect={(codePlacement) => updatePreferences({ codePlacement })}
        options={CODE_PLACEMENTS.map((placement) => ({
          value: placement,
          label: t(`codePlacements.${placement}`),
        }))}
      />
    </Section>
  );
}

export function WatermarkControls({
  includeFields = true,
  includeReset = true,
}: {
  /**
   * Desligado onde os interruptores de campo e o lugar do código já aparecem
   * em outro lugar — a coluna dos dados, no layout de três colunas.
   */
  includeFields?: boolean;
  /**
   * Desligado no painel de captura.
   *
   * Restaurar o padrão é saída de emergência, usada uma vez na vida. Numa tela
   * que disputa cada pixel, não merece espaço permanente — continua na rota de
   * Configurações, que é onde se procura por ela.
   */
  includeReset?: boolean;
} = {}) {
  const t = useTranslations('app.watermark');
  const tCommon = useTranslations('app.common');
  const { preferences, updatePreferences, setBrandPart, setBrandLogo, resetPreferences } =
    useSettings();
  const { ask, notify } = useFeedback();

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      ask({
        title: t('logoPermissionTitle'),
        message: t('logoPermissionMessage'),
        actions: [{ label: tCommon('gotIt') }],
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
      notify(t('logoAdded'));
    } catch (error) {
      console.warn('[marca] falha ao guardar o logotipo.', error);
      ask({
        title: t('logoErrorTitle'),
        message: t('logoErrorMessage'),
        actions: [{ label: tCommon('gotIt') }],
      });
    }
  };

  const { brandPlacement } = preferences;

  return (
    <>
      {includeFields ? <WatermarkFieldToggles /> : null}

      <Section title={t('positionTitle')} description={t('positionDescription')}>
        <ChoiceGrid
          columns={2}
          selected={preferences.position}
          onSelect={(position) => updatePreferences({ position })}
          options={WATERMARK_POSITIONS.map((position) => ({
            value: position,
            label: t(`positions.${position}`),
          }))}
        />
      </Section>

      <Section title={t('sizeTitle')}>
        <ChoiceGrid
          columns={3}
          selected={preferences.scale}
          onSelect={(scale) => updatePreferences({ scale })}
          options={WATERMARK_SCALES.map((scale) => ({
            value: scale,
            label: t(`sizes.${scale}`),
          }))}
        />
      </Section>

      {/* O formato em que a hora é PREENCHIDA — o campo segue editável.
          Preferência, e não deteção do aparelho: o carimbo não pode mudar de
          cara porque o celular trocou de configuração. */}
      <Section title={t('timeFormatTitle')} description={t('timeFormatDescription')}>
        <ChoiceGrid
          columns={2}
          selected={preferences.timeFormat}
          onSelect={(timeFormat) => updatePreferences({ timeFormat })}
          options={TIME_FORMATS.map((format) => ({
            value: format,
            label: t(`timeFormats.${format}`),
          }))}
        />
      </Section>

      <Section title={t('colorsTitle')} description={t('colorsDescription')}>
        <ColorField
          label={t('accentColor')}
          value={preferences.stampAccent}
          onChange={(stampAccent) => updatePreferences({ stampAccent })}
        />
        <ColorField
          label={t('textColor')}
          value={preferences.stampTextColor}
          onChange={(stampTextColor) => updatePreferences({ stampTextColor })}
        />
      </Section>

      {includeFields ? <CodePlacementControl /> : null}

      <Section title={t('brandTitle')} description={t('brandDescription')}>
        <ChoiceGrid
          columns={3}
          selected={brandPlacement}
          onSelect={(placement) => updatePreferences({ brandPlacement: placement })}
          options={BRAND_PLACEMENTS.map((placement) => ({
            value: placement,
            label: t(`brandPlacements.${placement}`),
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
                  label={index === 0 ? t('brandFirstPart') : t('brandSecondPart')}
                  value={preferences.brandParts[index].text}
                  onChangeText={(text) => setBrandPart(index, { text })}
                  placeholder={index === 0 ? t('brandFirstHint') : t('brandSecondHint')}
                  maxLength={BRAND_PART_MAX_LENGTH}
                  // Sem forçar maiúsculas: com elas, "AutoGlass" e "TecnoSul"
                  // seriam impossíveis de digitar — e são exatamente o caso
                  // que a marca em duas partes atende.
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <ColorField
                  label={index === 0 ? t('brandFirstColor') : t('brandSecondColor')}
                  value={preferences.brandParts[index].color}
                  onChange={(color) => setBrandPart(index, { color })}
                />
              </View>
            ))}

            <Text style={styles.hint}>{t('brandNote')}</Text>

            {brandPlacement === 'header' ? (
              <View style={styles.brandBody}>
                <FieldRow
                  label={t('complement')}
                  value={preferences.brandComplement}
                  onChangeText={(brandComplement) => updatePreferences({ brandComplement })}
                  placeholder={t('complementHint')}
                  maxLength={BRAND_COMPLEMENT_MAX_LENGTH}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />
                <ColorField
                  label={t('complementColor')}
                  value={preferences.brandComplementColor}
                  onChange={(brandComplementColor) => updatePreferences({ brandComplementColor })}
                />

                <View style={styles.logoRow}>
                  {preferences.brandLogoPath ? (
                    <Image
                      source={{ uri: resolveLogoUri(preferences.brandLogoPath) }}
                      style={styles.logoPreview}
                      contentFit="contain"
                      accessibilityLabel={t('logoChosen')}
                    />
                  ) : null}

                  <View style={styles.logoActions}>
                    <Button
                      label={preferences.brandLogoPath ? t('logoReplace') : t('logoPick')}
                      icon="image-outline"
                      variant="ghost"
                      onPress={() => void pickLogo()}
                    />
                    {preferences.brandLogoPath ? (
                      <Button
                        label={t('logoRemove')}
                        icon="close"
                        variant="ghost"
                        onPress={() => setBrandLogo(null)}
                      />
                    ) : null}
                  </View>
                </View>

                <Text style={styles.hint}>{t('logoFormatNote')}</Text>
                <Text style={styles.hint}>{t('logoAlignNote')}</Text>

                {preferences.brandLogoPath ? (
                  <SliderRow
                    // Escala proporcional — largura e altura juntas. Um eixo
                    // por vez deformaria o logotipo, e isso não é opção.
                    label={t('logoSize')}
                    value={preferences.brandLogoScale}
                    min={BRAND_LOGO_SCALE_MIN}
                    max={BRAND_LOGO_SCALE_MAX}
                    step={0.05}
                    format={(value) => `${Math.round(value * 100)}%`}
                    onChange={(brandLogoScale) => updatePreferences({ brandLogoScale })}
                  />
                ) : null}
              </View>
            ) : (
              <ChoiceGrid
                columns={2}
                selected={preferences.brandPosition}
                onSelect={(brandPosition) => updatePreferences({ brandPosition })}
                options={WATERMARK_POSITIONS.map((position) => ({
                  value: position,
                  label: t(`positions.${position}`),
                }))}
              />
            )}
          </View>
        ) : null}
      </Section>

      {brandPlacement === 'corner' && preferences.brandPosition === preferences.position ? (
        <Text style={styles.conflict}>{t('cornerConflict')}</Text>
      ) : null}

      <Section title={t('backdropTitle')} description={t('backdropDescription')}>
        <ChoiceGrid
          columns={3}
          selected={preferences.backdropStyle}
          onSelect={(backdropStyle) => updatePreferences({ backdropStyle })}
          options={BACKDROP_STYLES.map((style) => ({
            value: style,
            label: t(`backdropStyles.${style}`),
          }))}
        />

        {preferences.backdropStyle !== 'none' ? (
          <View style={styles.brandBody}>
            <Text style={styles.hint}>
              {preferences.backdropStyle === 'block' ? t('backdropBlockNote') : t('backdropBandNote')}
            </Text>
            <ColorField
              label={t('backdropColor')}
              value={preferences.backdropColor}
              onChange={(backdropColor) => updatePreferences({ backdropColor })}
            />
            <SliderRow
              label={t('backdropOpacity')}
              value={preferences.backdropOpacity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => t('backdropOpacityValue', { percent: Math.round(value * 100) })}
              onChange={(backdropOpacity) => updatePreferences({ backdropOpacity })}
            />
            <SliderRow
              // Na faixa contínua o raio só vale para os cantos virados para
              // dentro da foto; nos que encostam na borda ele abriria um
              // triângulo da imagem.
              label={
                preferences.backdropStyle === 'block'
                  ? t('backdropRadius')
                  : t('backdropInnerRadius')
              }
              value={preferences.backdropRadius}
              min={0}
              max={24}
              step={1}
              format={(value) => (value === 0 ? t('backdropRadiusSquare') : `${value}`)}
              onChange={(backdropRadius) => updatePreferences({ backdropRadius })}
            />
          </View>
        ) : null}
      </Section>

      <Section title={t('legibilityTitle')}>
        <ToggleRow
          title={t('includeCountry')}
          description={t('includeCountryDescription')}
          value={preferences.includeCountry}
          onValueChange={(includeCountry) => updatePreferences({ includeCountry })}
          showDivider={false}
        />
      </Section>

      {includeReset ? (
        <Button
          label={t('reset')}
          icon="refresh"
          variant="ghost"
          onPress={resetPreferences}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
