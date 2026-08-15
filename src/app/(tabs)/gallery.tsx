import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { PhotoCard } from '@/components/gallery/photo-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { useFeedback } from '@/contexts/feedback-context';
import { useGallery } from '@/contexts/gallery-context';
import { colors, spacing, typography } from '@/theme';

/**
 * Galeria — histórico das fotos já exportadas.
 *
 * Lê o índice do `GalleryProvider`, então entrar e sair da aba não recarrega
 * nada. Toque num item abre o detalhe empilhado *por cima* das abas, o que
 * mantém a aba Capturar viva por baixo.
 */
export default function GalleryScreen() {
  const t = useTranslations('app');
  const { entries, hydrated, clearGallery } = useGallery();
  const { ask } = useFeedback();
  const router = useRouter();

  const confirmClear = () => {
    ask({
      title: t('gallery.clear'),
      message: t('gallery.clearMessage'),
      actions: [
        { label: t('gallery.clearConfirm'), destructive: true, onPress: clearGallery },
        { label: t('common.cancel'), variant: 'ghost' },
      ],
    });
  };

  if (hydrated && entries.length === 0) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          icon="images-outline"
          title={t('gallery.empty')}
          description={t('gallery.emptyDescription')}
          actionLabel={t('gallery.emptyAction')}
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={typography.screenTitle}>{t('gallery.title')}</Text>
            {/*
              A contagem sai do catálogo com plural ICU. O ternário anterior
              -- uma foto contra várias -- acertava em português e erraria em
              russo, que tem quatro formas, e em árabe, que tem seis.
            */}
            <Text style={typography.caption}>{t('gallery.count', { count: entries.length })}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PhotoCard entry={item} onPress={() => router.push(`/photo/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          entries.length > 0 ? (
            <Button
              label={t('gallery.clear')}
              icon="trash-outline"
              variant="danger"
              onPress={confirmClear}
              style={styles.footerAction}
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  footerAction: {
    marginTop: spacing.xl,
  },
});
