import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { NavRow } from '@/components/ui/nav-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useGallery } from '@/contexts/gallery-context';
import { useSettings } from '@/contexts/settings-context';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS, WATERMARK_POSITION_LABELS } from '@/types';

/**
 * Configurações — o índice.
 *
 * Cada linha mostra um resumo do estado atual à direita, para que o usuário
 * saiba o que está valendo sem precisar abrir a tela.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { preferences, visibleFieldCount } = useSettings();
  const { entries } = useGallery();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size="sm" />
        <Text style={typography.screenTitle}>Configurações</Text>
      </View>

      <Section
        title="Marca d’água"
        description="O que é carimbado sobre a foto e onde.">
        <NavRow
          icon="pricetags-outline"
          title="Campos e posição"
          description="Escolha os campos exibidos, o canto e o tamanho"
          value={`${visibleFieldCount}/${WATERMARK_FIELD_KEYS.length} · ${
            WATERMARK_POSITION_LABELS[preferences.position]
          }`}
          onPress={() => router.push('/settings/watermark')}
          showDivider={false}
        />
      </Section>

      <Section title="Aparelho" description="Acessos que o Lymark solicita.">
        <NavRow
          icon="lock-closed-outline"
          title="Permissões"
          description="Câmera, fotos e localização"
          onPress={() => router.push('/settings/permissions')}
          showDivider={false}
        />
      </Section>

      <Section title="Aplicativo">
        <NavRow
          icon="images-outline"
          title="Histórico"
          description="Fotos exportadas guardadas no aparelho"
          value={String(entries.length)}
          onPress={() => router.navigate('/gallery')}
        />
        <NavRow
          icon="information-circle-outline"
          title="Sobre o Lymark"
          description="Versão, privacidade e créditos"
          value={`v${appVersion}`}
          onPress={() => router.push('/settings/about')}
          showDivider={false}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
});
