import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { FieldRow } from '@/components/ui/field-row';
import { Section } from '@/components/ui/section';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useSettings } from '@/contexts/settings-context';
import { BRAND_PART_MAX_LENGTH } from '@/features/watermark/preferences';
import { colors, spacing, typography } from '@/theme';
import {
  BRAND_MODES,
  CODE_PLACEMENTS,
  WATERMARK_FIELD_KEYS,
  WATERMARK_POSITIONS,
  WATERMARK_SCALES,
  STAMP_COLOR_KEYS,
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
  const { preferences, setCodePlacement } = useSettings();

  return (
    <Section
      title={t('codeTitle')}
      description={t('codeDescription')}>
      <ChoiceGrid
        columns={2}
        selected={preferences.codePlacement}
        onSelect={setCodePlacement}
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
  const {
    preferences,
    setPosition,
    setScale,
    setShowBackdrop,
    setIncludeCountry,
    setShowBrand,
    setBrandPosition,
    setBrandMode,
    setBrandPart,
    setCodePlacement,
    resetPreferences,
  } = useSettings();

  return (
    <>
      {includeFields ? <WatermarkFieldToggles /> : null}

      <Section title={t('positionTitle')} description={t('positionDescription')}>
        <ChoiceGrid
          columns={2}
          selected={preferences.position}
          onSelect={setPosition}
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
          onSelect={setScale}
          options={WATERMARK_SCALES.map((scale) => ({
            value: scale,
            label: t(`sizes.${scale}`),
          }))}
        />
      </Section>

      {includeFields ? <CodePlacementControl /> : null}

      <Section
        title={t('brandTitle')}
        description={t('brandDescription')}>
        <ToggleRow
          title={t('brandToggle')}
          description={t('brandToggleDescription')}
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
                label: t(`brandModes.${mode}`),
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
                      label={index === 0 ? t('brandFirstPart') : t('brandSecondPart')}
                      value={preferences.brandParts[index].text}
                      onChangeText={(text) => setBrandPart(index, { text })}
                      placeholder={index === 0 ? t('brandFirstHint') : t('brandSecondHint')}
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
                        label: t(`colors.${color}`),
                      }))}
                    />
                  </View>
                ))}

                <Text style={typography.caption}>{t('brandNote')}</Text>
              </View>
            ) : null}

            <ChoiceGrid
              columns={2}
              selected={preferences.brandPosition}
              onSelect={setBrandPosition}
              options={WATERMARK_POSITIONS.map((position) => ({
                value: position,
                label: t(`positions.${position}`),
              }))}
            />
          </View>
        ) : null}
      </Section>

      {preferences.showBrand && preferences.brandPosition === preferences.position ? (
        <Text style={styles.conflict}>{t('cornerConflict')}</Text>
      ) : null}

      <Section title={t('legibilityTitle')}>
        <ToggleRow
          title={t('backdrop')}
          description={t('backdropDescription')}
          value={preferences.showBackdrop}
          onValueChange={setShowBackdrop}
        />
        <ToggleRow
          title={t('includeCountry')}
          description={t('includeCountryDescription')}
          value={preferences.includeCountry}
          onValueChange={setIncludeCountry}
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
  conflict: {
    ...typography.caption,
    color: colors.accent,
    paddingHorizontal: spacing.xs,
  },
});
