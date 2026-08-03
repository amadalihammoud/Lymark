import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

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
        title: 'Acesso às fotos negado',
        message:
          'Libere em Configurações › Permissões para guardar as imagens na galeria do aparelho.',
        actions: [{ label: 'Entendi' }],
      });
      return;
    }

    notify(
      saved === chosen.length
        ? `${saved === 1 ? 'Uma foto salva' : `${saved} fotos salvas`} na galeria do aparelho.`
        : `${saved} de ${chosen.length} fotos salvas.`,
      saved === chosen.length ? 'neutral' : 'warning',
    );
  };

  const removeSelected = () => {
    const chosen = selectedEntries();

    ask({
      title: chosen.length === 1 ? 'Remover do histórico' : `Remover ${chosen.length} registros`,
      message:
        'Os registros saem do Lymark. As imagens já salvas na galeria do aparelho não são afetadas.',
      actions: [
        {
          label: 'Remover',
          destructive: true,
          onPress: () => {
            for (const entry of chosen) removeEntry(entry.id);
            setSelection(null);
            notify(chosen.length === 1 ? 'Registro removido.' : 'Registros removidos.');
          },
        },
        { label: 'Cancelar', variant: 'ghost' },
      ],
    });
  };

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
        data={visible}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={typography.screenTitle}>Galeria</Text>
              {/* Ação destrutiva no topo, e não no fim da rolagem: lá ela fica
                  no caminho natural do dedo de quem está só percorrendo a
                  lista. */}
              <Button
                label={selecting ? 'Cancelar seleção' : 'Limpar histórico'}
                icon={selecting ? 'close' : 'trash-outline'}
                iconOnly
                variant={selecting ? 'ghost' : 'danger'}
                onPress={selecting ? () => setSelection(null) : confirmClear}
                disabled={working}
              />
            </View>

            <Text style={typography.caption}>
              {describeCount(entries.length, visible.length, query, selectedIds.size)}
            </Text>

            <TextInput
              accessibilityLabel="Buscar por endereço, data ou código"
              placeholder="Buscar por endereço, data ou código"
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
            Nenhuma foto encontrada para “{query}”.
          </Text>
        }
      />

      {selecting && selectedIds.size > 0 ? (
        <View style={styles.bulkBar}>
          <Button
            label="Salvar na galeria"
            icon="download"
            variant="accent"
            onPress={() => void saveSelected()}
            loading={working}
            style={styles.bulkAction}
          />
          <Button
            label="Remover"
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

function describeCount(total: number, shown: number, query: string, selected: number) {
  if (selected > 0) {
    return selected === 1 ? '1 foto selecionada' : `${selected} fotos selecionadas`;
  }
  if (query.trim()) {
    return `${shown} de ${total} ${total === 1 ? 'foto' : 'fotos'}`;
  }
  return total === 1 ? '1 foto exportada' : `${total} fotos exportadas`;
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
