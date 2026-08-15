import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useFeedback } from '@/contexts/feedback-context';
import { useGallery } from '@/contexts/gallery-context';
import { resolveExportedPhotoUri } from '@/features/watermark/photo-file';
import { useLocalePreference } from '@/contexts/locale-context';
import { formatTimestamp } from '@/lib/datetime';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Detalhe de uma foto do histórico.
 *
 * Empilhada acima das abas: fechar volta para a Galeria exatamente onde
 * estava, e a aba Capturar segue intacta por baixo.
 */
export default function PhotoDetailScreen() {
  const t = useTranslations('app');
  const { locale } = useLocalePreference();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findEntry, removeEntry } = useGallery();
  const { ask } = useFeedback();
  const router = useRouter();

  const entry = findEntry(id);

  if (!entry) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          icon="help-circle-outline"
          title={t('photo.notFoundTitle')}
          description={t('photo.notFoundBody')}
          actionLabel={t('photo.backToGallery')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    ask({
      title: t('photo.removeTitle'),
      message: t('photo.removeBody'),
      actions: [
        {
          label: t('photo.remove'),
          destructive: true,
          onPress: () => {
            removeEntry(entry.id);
            router.back();
          },
        },
        { label: t('common.cancel'), variant: 'ghost' },
      ],
    });
  };

  return (
    <Screen>
      <Image
        source={{ uri: resolveExportedPhotoUri(entry.path) }}
        style={styles.photo}
        contentFit="contain"
      />

      <Text style={typography.caption}>
        {t('photo.exportedAt', { when: formatTimestamp(entry.exportedAt, locale) })}
      </Text>

      <Section title={t('photo.stampedData')}>
        {/* Só o que realmente foi para a imagem. Listar um campo que ficou de
            fora afirmaria algo falso sobre um registro fotográfico. */}
        {entry.stampedFields.map((key, index) => (
          <View
            key={key}
            style={[
              styles.row,
              index < entry.stampedFields.length - 1 && styles.divider,
            ]}>
            <Text style={typography.label}>{t(`watermark.fields.${key}`)}</Text>
            <Text style={typography.value}>{entry.metadata[key]}</Text>
          </View>
        ))}
        {entry.stampedFields.length === 0 ? (
          <View style={styles.row}>
            <Text style={typography.caption}>{t('photo.noWatermark')}</Text>
          </View>
        ) : null}
      </Section>

      <Button
        label={t('photo.removeTitle')}
        icon="trash-outline"
        variant="danger"
        onPress={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
