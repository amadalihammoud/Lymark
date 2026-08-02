import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

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
  const { entries, hydrated, clearGallery } = useGallery();
  const { ask } = useFeedback();
  const router = useRouter();

  const confirmClear = () => {
    ask({
      title: 'Limpar histórico',
      message:
        'Os registros do Lymark serão apagados. As imagens já salvas na galeria do aparelho não são afetadas.',
      actions: [
        { label: 'Limpar', destructive: true, onPress: clearGallery },
        { label: 'Cancelar', variant: 'ghost' },
      ],
    });
  };

  if (hydrated && entries.length === 0) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          icon="images-outline"
          title="Nenhuma foto ainda"
          description="As fotos que você exportar com marca d’água aparecem aqui, com data, local e código."
          actionLabel="Ir para Capturar"
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
            <Text style={typography.screenTitle}>Galeria</Text>
            <Text style={typography.caption}>
              {entries.length === 1 ? '1 foto exportada' : `${entries.length} fotos exportadas`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PhotoCard entry={item} onPress={() => router.push(`/photo/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          entries.length > 0 ? (
            <Button
              label="Limpar histórico"
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
