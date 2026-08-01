import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { PHOTO_CODE_LENGTH, normalizePhotoCode } from '@/lib/photo-code';
import { spacing } from '@/theme';
import {
  WATERMARK_FIELD_LABELS,
  type CaptureMetadata,
  type WatermarkFieldKey,
} from '@/types';

/**
 * Os campos que compõem a marca d'água.
 *
 * Todos são editáveis: o automático (relógio, GPS, sorteio do código) é o
 * ponto de partida, não uma imposição — quem está em campo às vezes precisa
 * corrigir o endereço ou registrar a hora real do ocorrido.
 */
export function MetadataForm({
  metadata,
  onChangeField,
  onRegenerateCode,
  onLocate,
  locating = false,
}: {
  metadata: CaptureMetadata;
  onChangeField: (key: WatermarkFieldKey, value: string) => void;
  onRegenerateCode: () => void;
  onLocate: () => void;
  locating?: boolean;
}) {
  return (
    <View style={styles.container}>
      <FieldRow
        label={WATERMARK_FIELD_LABELS.time}
        value={metadata.time}
        onChangeText={(value) => onChangeField('time', value)}
        placeholder="00:00"
        keyboardType="numbers-and-punctuation"
      />

      <FieldRow
        label={WATERMARK_FIELD_LABELS.date}
        value={metadata.date}
        onChangeText={(value) => onChangeField('date', value)}
        placeholder="01 jan. 2026"
      />

      <FieldRow
        label={WATERMARK_FIELD_LABELS.weekday}
        value={metadata.weekday}
        onChangeText={(value) => onChangeField('weekday', value)}
        placeholder="Seg"
      />

      <FieldRow
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
            style={styles.trailingAction}
          />
        }
      />

      <FieldRow
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
            style={styles.trailingAction}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  trailingAction: {
    paddingHorizontal: spacing.lg,
  },
});
