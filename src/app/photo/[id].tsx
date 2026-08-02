import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useGallery } from '@/contexts/gallery-context';
import { resolveExportedPhotoUri } from '@/features/watermark/photo-file';
import { formatTimestamp } from '@/lib/datetime';
import { colors, radius, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_LABELS } from '@/types';

/**
 * Detalhe de uma foto do histórico.
 *
 * Empilhada acima das abas: fechar volta para a Galeria exatamente onde
 * estava, e a aba Capturar segue intacta por baixo.
 */
export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findEntry, removeEntry } = useGallery();
  const router = useRouter();

  const entry = findEntry(id);

  if (!entry) {
    return (
      <Screen scrollable={false}>
        <EmptyState
          icon="help-circle-outline"
          title="Foto não encontrada"
          description="Este registro pode ter sido removido do histórico."
          actionLabel="Voltar para a Galeria"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      'Remover do histórico',
      'O registro sai do Lymark. A imagem salva na galeria do aparelho não é afetada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removeEntry(entry.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Image
        source={{ uri: resolveExportedPhotoUri(entry.path) }}
        style={styles.photo}
        contentFit="contain"
      />

      <Text style={typography.caption}>Exportada em {formatTimestamp(entry.exportedAt)}</Text>

      <Section title="Dados carimbados">
        {/* Só o que realmente foi para a imagem. Listar um campo que ficou de
            fora afirmaria algo falso sobre um registro fotográfico. */}
        {entry.stampedFields.map((key, index) => (
          <View
            key={key}
            style={[
              styles.row,
              index < entry.stampedFields.length - 1 && styles.divider,
            ]}>
            <Text style={typography.label}>{WATERMARK_FIELD_LABELS[key]}</Text>
            <Text style={typography.value}>{entry.metadata[key]}</Text>
          </View>
        ))}
        {entry.stampedFields.length === 0 ? (
          <View style={styles.row}>
            <Text style={typography.caption}>
              Esta foto foi exportada sem marca d’água.
            </Text>
          </View>
        ) : null}
      </Section>

      <Button
        label="Remover do histórico"
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
