import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { PHOTO_CODE_LENGTH, normalizePhotoCode } from '@/lib/photo-code';
import { colors, spacing, typography } from '@/theme';
import {
  WATERMARK_FIELD_KEYS,
  WATERMARK_FIELD_LABELS,
  type CaptureMetadata,
  type WatermarkFieldKey,
} from '@/types';

/**
 * Os campos que compõem a marca d'água.
 *
 * O formulário mostra **apenas os campos que serão carimbados**. Exibir um
 * campo que não vai para a foto convida o usuário a preencher algo que o app
 * vai descartar em silêncio — foi exatamente o que acontecia com o Código de
 * Foto, que continuava na tela mesmo desligado nas preferências.
 *
 * Quando algo está oculto, uma linha discreta diz o quê e onde reativar: sem
 * ela, o campo simplesmente sumiria e ninguém descobriria como trazê-lo.
 *
 * Todos os campos são editáveis: o automático (relógio, GPS, sorteio do
 * código) é o ponto de partida, não uma imposição — quem está em campo às
 * vezes precisa corrigir o endereço ou registrar a hora real do ocorrido.
 */
export function MetadataForm({
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
  /** Quais campos serão carimbados — define o que aparece aqui. */
  visibleFields: Record<WatermarkFieldKey, boolean>;
  onChangeField: (key: WatermarkFieldKey, value: string) => void;
  /** Realinha hora, data e dia da semana com o relógio do aparelho. */
  onSyncDateTime: () => void;
  onRegenerateCode: () => void;
  onLocate: () => void;
  locating?: boolean;
  /** Trava o formulário enquanto a imagem está sendo gerada. */
  disabled?: boolean;
}) {
  // Hora, data e dia da semana formam um conjunto: o botão "Agora" atualiza os
  // três de uma vez, e o cabeçalho só faz sentido se algum deles estiver ativo.
  const showDateTimeGroup =
    visibleFields.time || visibleFields.date || visibleFields.weekday;

  const hiddenLabels = WATERMARK_FIELD_KEYS.filter((key) => !visibleFields[key]).map(
    (key) => WATERMARK_FIELD_LABELS[key],
  );

  return (
    <View style={styles.container}>
      {showDateTimeGroup ? (
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={typography.sectionTitle}>Data e hora</Text>
            <Button
              label="Agora"
              icon="time-outline"
              variant="ghost"
              onPress={onSyncDateTime}
              disabled={disabled}
              style={styles.headerAction}
            />
          </View>

          {visibleFields.time ? (
            <FieldRow
              editable={!disabled}
              label={WATERMARK_FIELD_LABELS.time}
              value={metadata.time}
              onChangeText={(value) => onChangeField('time', value)}
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
              editable={!disabled}
              label={WATERMARK_FIELD_LABELS.date}
              value={metadata.date}
              onChangeText={(value) => onChangeField('date', value)}
              placeholder="01 jan. 2026"
            />
          ) : null}

          {visibleFields.weekday ? (
            <FieldRow
              editable={!disabled}
              label={WATERMARK_FIELD_LABELS.weekday}
              value={metadata.weekday}
              onChangeText={(value) => onChangeField('weekday', value)}
              placeholder="Seg"
            />
          ) : null}
        </View>
      ) : null}

      {visibleFields.address ? (
        <FieldRow
          editable={!disabled}
          label={WATERMARK_FIELD_LABELS.address}
          value={metadata.address}
          onChangeText={(value) => onChangeField('address', value)}
          placeholder="Toque em localizar ou digite o endereço"
          multiline
          trailing={
            <Button
              label="Localizar"
              icon="location"
              variant="primary"
              onPress={onLocate}
              loading={locating}
              disabled={disabled}
              style={styles.trailingAction}
            />
          }
        />
      ) : null}

      {visibleFields.code ? (
        <FieldRow
          editable={!disabled}
          label={WATERMARK_FIELD_LABELS.code}
          value={metadata.code}
          onChangeText={(value) => onChangeField('code', normalizePhotoCode(value))}
          placeholder="—"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={PHOTO_CODE_LENGTH}
          trailing={
            <Button
              label="Gerar"
              variant="primary"
              onPress={onRegenerateCode}
              disabled={disabled}
              style={styles.trailingAction}
            />
          }
        />
      ) : null}

      {hiddenLabels.length > 0 ? (
        <Text style={styles.hiddenHint}>
          {hiddenLabels.length === 1 ? 'Campo oculto' : 'Campos ocultos'}:{' '}
          {hiddenLabels.join(', ')} — ative em Configurações › Campos e posição.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerAction: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  trailingAction: {
    paddingHorizontal: spacing.lg,
  },
  hiddenHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
