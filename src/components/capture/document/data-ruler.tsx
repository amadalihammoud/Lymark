import { Platform, StyleSheet, Text, View } from 'react-native';
import { useFormatter, useTranslations } from 'use-intl';

import { FIELD_MAX_LENGTH } from '@/components/capture/field-limits';
import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { PHOTO_CODE_LENGTH, normalizePhotoCode } from '@/lib/photo-code';
import { colors, spacing, typography } from '@/theme';
import {
  WATERMARK_FIELD_KEYS,
  type CaptureMetadata,
  type WatermarkFieldKey,
} from '@/types';

import { AddressCell } from './address-cell';
import { CELL_MIN_WIDTH, RULER_BUTTON_SIZE } from './document-layout';

/**
 * A régua: os dados que saem carimbados, editáveis, colados na foto.
 *
 * É o mesmo conteúdo do `MetadataForm` do celular — mesmos campos, mesmos
 * rótulos, mesmos tetos de comprimento — deitado numa linha. A diferença não é
 * de forma, é de tese: no celular o formulário é um lugar aonde se vai; aqui o
 * dado fica onde ele aparece, encostado na imagem que vai recebê-lo. Foto e
 * dados são um documento só.
 *
 * O contrato de props é idêntico ao do `MetadataForm` de propósito: quem monta
 * a tela liga os mesmos handlers nos dois, sem tradução no meio.
 */

/**
 * Comprime a caixa de 56 para 44.
 *
 * `FieldRow` espalha `style` sobre o `TextInput` por último, então o ajuste é
 * do consumidor — editar o `FieldRow` para caber aqui mudaria a altura dos
 * campos no celular também.
 */
const COMPACT_INPUT = {
  minHeight: 44,
  height: 44,
  maxHeight: 44,
  paddingVertical: spacing.sm,
  // O recuo lateral também encolhe: com os 16px do formulário empilhado, a
  // célula da hora ficava com 33px úteis e cortava "19:13" — texto cortado em
  // silêncio, que é o defeito que a régua inteira existe para evitar.
  paddingHorizontal: spacing.md,
} as const;

/** Quadrado, no piso de alvo do projeto, ao lado do campo que ele serve. */
const RULER_BUTTON = { width: RULER_BUTTON_SIZE, height: RULER_BUTTON_SIZE } as const;

export function DataRuler({
  metadata,
  visibleFields,
  onChangeField,
  onSyncDateTime,
  onRegenerateCode,
  onLocate,
  locating = false,
  disabled = false,
}: {
  metadata: CaptureMetadata;
  visibleFields: Record<WatermarkFieldKey, boolean>;
  onChangeField: (key: WatermarkFieldKey, value: string) => void;
  onSyncDateTime: () => void;
  onRegenerateCode: () => void;
  onLocate: () => void;
  locating?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('app');

  const showDateTimeGroup =
    visibleFields.time || visibleFields.date || visibleFields.weekday;

  return (
    /* Sem `flexWrap`: quebrar para uma segunda linha estouraria a altura
       reservada para a régua, e o quadro da foto passaria a mentir sobre o
       espaço que tem. Os `minWidth` por célula é que seguram a linha. */
    <View style={styles.row}>
      {visibleFields.time ? (
        <FieldRow
          containerStyle={styles.timeCell}
          style={COMPACT_INPUT}
          editable={!disabled}
          label={t('watermark.fields.time')}
          value={metadata.time}
          onChangeText={(value) => onChangeField('time', value)}
          maxLength={FIELD_MAX_LENGTH.time}
          placeholder="00:00"
          // `numbers-and-punctuation` existe só no iOS; no Android o RN
          // cairia no teclado alfabético completo para digitar "14:38".
          keyboardType={Platform.select({
            ios: 'numbers-and-punctuation',
            default: 'numeric',
          })}
        />
      ) : null}

      {visibleFields.date ? (
        <FieldRow
          containerStyle={styles.dateCell}
          style={COMPACT_INPUT}
          editable={!disabled}
          label={t('watermark.fields.date')}
          value={metadata.date}
          onChangeText={(value) => onChangeField('date', value)}
          maxLength={FIELD_MAX_LENGTH.date}
          placeholder={t('capture.dateHint')}
        />
      ) : null}

      {visibleFields.weekday ? (
        <FieldRow
          containerStyle={styles.weekdayCell}
          style={COMPACT_INPUT}
          shortLabel={t('capture.weekdayShort')}
          editable={!disabled}
          label={t('watermark.fields.weekday')}
          value={metadata.weekday}
          onChangeText={(value) => onChangeField('weekday', value)}
          maxLength={FIELD_MAX_LENGTH.weekday}
          placeholder={t('capture.weekdayHint')}
        />
      ) : null}

      {/* No celular este botão mora no cabeçalho do grupo "Data e hora". A
          régua não tem cabeçalho, e sem ele o realinhamento com o relógio do
          aparelho ficaria sem porta nenhuma na tela larga. */}
      {showDateTimeGroup ? (
        <Button
          label={t('capture.syncNow')}
          icon="time-outline"
          iconOnly
          variant="ghost"
          onPress={onSyncDateTime}
          disabled={disabled}
          style={styles.button}
        />
      ) : null}

      {visibleFields.address ? (
        <AddressCell
          containerStyle={styles.addressCell}
          editable={!disabled}
          label={t('watermark.fields.address')}
          value={metadata.address}
          onChangeText={(value) => onChangeField('address', value)}
          placeholder={t('capture.addressHint')}
        />
      ) : null}

      {visibleFields.address ? (
        <Button
          // Mira, e não o círculo de duas setas: aquele significa "recarregar".
          // Aqui a ação é descobrir onde estou.
          label={t('capture.locateByGps')}
          icon="locate"
          iconOnly
          variant="primary"
          onPress={onLocate}
          loading={locating}
          disabled={disabled}
          style={styles.button}
        />
      ) : null}

      {visibleFields.code ? (
        <FieldRow
          containerStyle={styles.codeCell}
          style={COMPACT_INPUT}
          editable={!disabled}
          label={t('watermark.fields.code')}
          value={metadata.code}
          onChangeText={(value) => onChangeField('code', normalizePhotoCode(value))}
          placeholder="—"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={PHOTO_CODE_LENGTH}
        />
      ) : null}

      {visibleFields.code ? (
        <Button
          label={t('capture.generateCode')}
          icon="refresh"
          iconOnly
          variant="primary"
          onPress={onRegenerateCode}
          disabled={disabled}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

/**
 * A linha de dicas embaixo da régua.
 *
 * Mora aqui, e não dentro da régua, porque a altura das duas é reservada
 * separadamente: misturá-las faria um aviso novo empurrar os campos.
 */
export function DataRulerFooter({
  visibleFields,
  addressHint,
  isEmpty,
}: {
  visibleFields: Record<WatermarkFieldKey, boolean>;
  addressHint?: { text: string; imprecise: boolean } | null;
  isEmpty: boolean;
}) {
  const t = useTranslations('app');
  const format = useFormatter();

  const hiddenLabels = WATERMARK_FIELD_KEYS.filter((key) => !visibleFields[key]).map(
    (key) => t(`watermark.fields.${key}`),
  );

  return (
    <View style={styles.footer}>
      {addressHint ? (
        <Text
          numberOfLines={1}
          style={[
            typography.caption,
            styles.footerText,
            addressHint.imprecise ? styles.warning : null,
          ]}>
          {addressHint.text}
        </Text>
      ) : null}

      {hiddenLabels.length > 0 ? (
        <Text numberOfLines={1} style={[typography.caption, styles.footerText]}>
          {/*
            A lista é montada pelo formatador do idioma, e não por
            `join(', ')`: em inglês a última vírgula vira "and", em alemão
            "und", e em árabe o separador é a própria conjunção colada à
            palavra seguinte.
          */}
          {t('capture.hiddenFields', {
            count: hiddenLabels.length,
            fields: format.list(hiddenLabels),
          })}
        </Text>
      ) : null}

      {isEmpty ? (
        <Text numberOfLines={1} style={[typography.caption, styles.footerText, styles.warning]}>
          {t('capture.emptyWarning')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Pelo pé: os rótulos ficam em cima e as caixas alinhadas na mesma linha
    // de base, com ou sem rótulo curto.
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  // As proporções acompanham o conteúdo, como no celular; os `minWidth` são o
  // que impede o endereço de esmagar os vizinhos numa janela apertada — sem
  // eles os campos encolhem em silêncio até ficarem ilegíveis.
  // Os pisos vêm de `document-layout`, que também os soma para decidir a
  // largura mínima do documento: se um apertar aqui, o outro acompanha.
  timeCell: { flex: 6, minWidth: CELL_MIN_WIDTH.time },
  dateCell: { flex: 9, minWidth: CELL_MIN_WIDTH.date },
  weekdayCell: { flex: 5, minWidth: CELL_MIN_WIDTH.weekday },
  addressCell: { flex: 24, minWidth: CELL_MIN_WIDTH.address },
  codeCell: { flex: 12, minWidth: CELL_MIN_WIDTH.code },
  button: {
    ...RULER_BUTTON,
    // O botão fica na altura da caixa, não do rótulo acima dela.
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  footerText: {
    flexShrink: 1,
  },
  warning: {
    color: colors.accent,
  },
});
