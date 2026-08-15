import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Wordmark } from '@/components/brand/wordmark';
import { NavRow } from '@/components/ui/nav-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useGallery } from '@/contexts/gallery-context';
import { useEntitlement } from '@/contexts/entitlement-context';
import { useLocalePreference } from '@/contexts/locale-context';
import { useSettings } from '@/contexts/settings-context';
import { colors, spacing, typography } from '@/theme';
import { WATERMARK_FIELD_KEYS } from '@/types';
import { LOCALE_NAMES } from '@i18n/locales';

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
  const { locale, isAutomatic } = useLocalePreference();
  const { access } = useEntitlement();
  const t = useTranslations('app');

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size="sm" />
        <Text style={typography.screenTitle}>{t('settings.title')}</Text>
      </View>

      <Section
        title={t('settings.watermarkSection')}
        description={t('settings.watermarkSectionDescription')}>
        <NavRow
          icon="pricetags-outline"
          title={t('settings.fields')}
          description={t('settings.fieldsDescription')}
          value={`${visibleFieldCount}/${WATERMARK_FIELD_KEYS.length} · ${t(
            `watermark.positions.${preferences.position}`,
          )}`}
          onPress={() => router.push('/settings/watermark')}
          showDivider={false}
        />
      </Section>

      <Section
        title={t('settings.deviceSection')}
        description={t('settings.deviceSectionDescription')}>
        <NavRow
          icon="lock-closed-outline"
          title={t('permissions.title')}
          description={t('settings.permissionsDescription')}
          onPress={() => router.push('/settings/permissions')}
        />
        <NavRow
          icon="language-outline"
          title={t('language.label')}
          description={t('language.selector')}
          value={isAutomatic ? t('language.automatic') : LOCALE_NAMES[locale]}
          onPress={() => router.push('/settings/language')}
          showDivider={false}
        />
      </Section>

      <Section title={t('settings.appSection')}>
        <NavRow
          icon="card-outline"
          title={t('plan.title')}
          description={
            access.remaining === null
              ? t('plan.unlimited')
              : t('plan.remaining', { remaining: access.remaining })
          }
          // Fração, no mesmo formato da linha de campos logo acima: "11/15"
          // se lê sem tradução em idioma nenhum.
          value={
            access.quota === null ? t('plan.pro') : `${access.remaining}/${access.quota}`
          }
          onPress={() => router.push('/settings/about')}
        />
        <NavRow
          icon="images-outline"
          title={t('settings.history')}
          description={t('settings.historyDescription')}
          value={String(entries.length)}
          onPress={() => router.navigate('/gallery')}
        />
        <NavRow
          icon="information-circle-outline"
          title={t('about.title')}
          description={t('settings.aboutDescription')}
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
