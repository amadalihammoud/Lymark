import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { PhotoCard } from '@/components/gallery/photo-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { useFeedback } from '@/contexts/feedback-context';
import { useGallery } from '@/contexts/gallery-context';
import { saveToDeviceGallery } from '@/features/watermark/export-photo';
import { filterGalleryEntries } from '@/lib/gallery-search';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Galeria — histórico das fotos já exportadas.
 *
 * Lê o índice do `GalleryProvider`, então entrar e sair da aba não recarrega
 * nada. Toque num item abre o detalhe empilhado *por cima* das abas, o que
 * mantém a aba Capturar viva por baixo.
 *
 * Uma vistoria produz dezenas de fotos. Sem busca, achar "aquela da Santos
 * Dumont" é rolar até encontrar; sem seleção múltipla, guardar dez na galeria
 * do aparelho são dez idas e voltas. As duas coisas mudam a aba de "lista do
 * que já fiz" para ferramenta de entregar o trabalho.
 */
export default function GalleryScreen() {
  const t = useTranslations('app');
  const { entries, hydrated, clearGallery, removeEntry } = useGallery();
  const { ask, notify } = useFeedback();
  const router = useRouter();

  const [query, setQuery] = useState('');
  /** `null` fora do modo de seleção — vazio é "modo ligado, nada marcado". */
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [working, setWorking] = useState(false);

  const visible = useMemo(() => filterGalleryEntries(entries, query), [entries, query]);

  const selecting = selection !== null;
  const selectedIds = selection ?? new Set<string>();

  const toggle = (id: string) => {
    setSelection((current) => {
      const next = new Set(current ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedEntries = () => entries.filter((entry) => selectedIds.has(entry.id));

  const saveSelected = async () => {
    const chosen = selectedEntries();
    setWorking(true);

    let saved = 0;
    let denied = false;

    for (const entry of chosen) {
      const outcome = await saveToDeviceGallery(entry.path);
      if (outcome.status === 'saved') saved += 1;
      if (outcome.status === 'denied') {
        denied = true;
        // Negada uma vez, negada para todas: insistir abriria o mesmo diálogo
        // do sistema dezenas de vezes.
        break;
      }
    }

    setWorking(false);
    setSelection(null);

    if (denied) {
      ask({
        title: t('gallery.saveDeniedTitle'),
        message: t('gallery.saveDeniedMessage'),
        actions: [{ label: t('common.gotIt') }],
      });
      return;
    }

    notify(
      saved === chosen.length
        ? t('gallery.savedAll', { count: saved })
        : t('gallery.savedSome', { saved, total: chosen.length }),
      saved === chosen.length ? 'neutral' : 'warning',
    );
  };

  const removeSelected = () => {
    const chosen = selectedEntries();

    ask({
      title: t('gallery.removeTitle', { count: chosen.length }),
      message: t('gallery.removeMessage'),
      actions: [
        {
          label: t('photo.remove'),
          destructive: true,
          onPress: () => {
            for (const entry of chosen) removeEntry(entry.id);
            setSelection(null);
            notify(t('gallery.removed', { count: chosen.length }));
          },
        },
        { label: t('common.cancel'), variant: 'ghost' },
      ],
    });
  };

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
        data={visible}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={typography.screenTitle}>{t('gallery.title')}</Text>
              {/* Ação destrutiva no topo, e não no fim da rolagem: lá ela fica
                  no caminho natural do dedo de quem está só percorrendo a
                  lista. */}
              <Button
                label={selecting ? t('gallery.cancelSelection') : t('gallery.clear')}
                icon={selecting ? 'close' : 'trash-outline'}
                iconOnly
                variant={selecting ? 'ghost' : 'danger'}
                onPress={selecting ? () => setSelection(null) : confirmClear}
                disabled={working}
              />
            </View>

            {/*
              As contagens saem do catálogo com plural ICU. Um ternário — uma
              foto contra várias — acertaria em português e erraria em russo,
              que tem quatro formas, e em árabe, que tem seis.
            */}
            <Text style={typography.caption}>
              {selectedIds.size > 0
                ? t('gallery.selectedCount', { count: selectedIds.size })
                : query.trim()
                  ? t('gallery.filteredCount', { shown: visible.length, total: entries.length })
                  : t('gallery.count', { count: entries.length })}
            </Text>

            <TextInput
              accessibilityLabel={t('gallery.searchPlaceholder')}
              placeholder={t('gallery.searchPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              style={styles.search}
            />
          </View>
        }
        renderItem={({ item }) => (
          <PhotoCard
            entry={item}
            selectable={selecting}
            selected={selectedIds.has(item.id)}
            onPress={() => (selecting ? toggle(item.id) : router.push(`/photo/${item.id}`))}
            // Toque longo entra na seleção com o item já marcado: é o gesto
            // que o Android consagrou para listas.
            onLongPress={() => toggle(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={[typography.caption, styles.noResults]}>
            {t('gallery.noResults', { query })}
          </Text>
        }
      />

      {selecting && selectedIds.size > 0 ? (
        <View style={styles.bulkBar}>
          <Button
            label={t('permissions.mediaLibrary')}
            icon="download"
            variant="accent"
            onPress={() => void saveSelected()}
            loading={working}
            style={styles.bulkAction}
          />
          <Button
            label={t('photo.remove')}
            icon="trash-outline"
            variant="ghost"
            onPress={removeSelected}
            disabled={working}
            style={styles.bulkAction}
          />
        </View>
      ) : null}
    </Screen>
  );
}


const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.value,
  },
  separator: {
    height: spacing.md,
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  /** Barra de ações em lote, ancorada acima da barra de abas. */
  bulkBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bulkAction: {
    flex: 1,
  },
});
