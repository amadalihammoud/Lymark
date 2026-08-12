import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { NavRow } from '@/components/ui/nav-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useGallery } from '@/contexts/gallery-context';
import { useSettings } from '@/contexts/settings-context';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS, WATERMARK_POSITION_LABELS } from '@/types';

/**
 * Configuracoes — o indice.
 *
 * Cada linha mostra um resumo do estado atual a direita, para que o usuario
 * saiba o que esta valendo sem precisar abrir a tela.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { preferences, visibleFieldCount } = useSettings();
  const { entries } = useGallery();
  const { t } = useTranslation();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size="sm" />
        <Text style={typography.screenTitle}>{t('settings.title')}</Text>
      </View>

      <Section
        title={t('settings.watermark')}
        description="O que e carimbado sobre a foto e onde.">
        <NavRow
          icon="pricetags-outline"
          title={t('settings.watermark')}
          description="Escolha os campos exibidos, o canto e o tamanho"
          value={`${visibleFieldCount}/${WATERMARK_FIELD_KEYS.length} · ${WATERMARK_POSITION_LABELS[preferences.position]}`}
          onPress={() => router.push('/settings/watermark')}
          showDivider={false}
        />
      </Section>

      <Section title={t('settings.permissions')} description="Acessos que o Lymark solicita.">
        <NavRow
          icon="lock-closed-outline"
          title={t('settings.permissions')}
          description="Camera, fotos e localizacao"
          onPress={() => router.push('/settings/permissions')}
          showDivider={false}
        />
      </Section>

      <Section title="Idioma">
        <NavRow
          icon="language-outline"
          title={t('language.label')}
          description={t('language.selector')}
          onPress={() => router.push('/settings/language')}
          showDivider={false}
        />
      </Section>

      <Section title="Aplicativo">
        <NavRow
          icon="images-outline"
          title="Historico"
          description="Fotos exportadas guardadas no aparelho"
          value={String(entries.length)}
          onPress={() => router.navigate('/gallery')}
        />
        <NavRow
          icon="information-circle-outline"
          title={t('about.title')}
          description="Versao, privacidade e creditos"
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
