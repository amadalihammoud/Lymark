import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Wordmark } from '@/components/brand/wordmark';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { colors, spacing, typography } from '@/theme';

/** Sobre o Lymark — identidade, versão e o compromisso de privacidade. */
export default function AboutScreen() {
  const t = useTranslations('app.about');
  const config = Constants.expoConfig;

  // `nativeApplicationVersion` é o que está gravado no APK/IPA; o app.json é
  // apenas a origem dele. Em desenvolvimento pelo Expo Go o nativo é do
  // próprio Expo Go, então a config é o valor correto ali.
  const version = Application.nativeApplicationVersion ?? config?.version ?? '—';
  const build = Application.nativeBuildVersion;
  const appVersion = build ? `${version} (build ${build})` : version;

  return (
    <Screen>
      <View style={styles.brand}>
        <Wordmark />
        <Text style={[typography.body, styles.pitch]}>{t('pitch')}</Text>
      </View>

      <Section title={t('appSection')}>
        {/* Vem do binário, não do app.json: dois builds da mesma versão
            precisam ser distinguíveis quando alguém relata um problema. */}
        <InfoRow label={t('version')} value={appVersion} />
        <InfoRow label={t('platform')} value={Platform.OS === 'ios' ? 'iOS' : 'Android'} />
        <InfoRow
          label={t('sdk')}
          value={config?.sdkVersion ?? '—'}
          showDivider={false}
        />
      </Section>

      <Section title={t('privacySection')}>
        <View style={styles.paragraph}>
          <Text style={typography.body}>{t('privacyOnDevice')}</Text>
          <Text style={typography.caption}>{t('privacyLocation')}</Text>
          {/* Precisão vale mais que uma frase redonda: para virar endereço, a
              coordenada é consultada pelo sistema operacional na rede. Afirmar
              que nada sai do aparelho seria falso — e contradiria a política de
              privacidade publicada do aplicativo. */}
          <Text style={typography.caption}>{t('privacyGeocoding')}</Text>
        </View>
      </Section>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  showDivider = true,
}: {
  label: string;
  value: string;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, showDivider && styles.divider]}>
      <Text style={typography.value}>{label}</Text>
      <Text style={typography.caption}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  pitch: {
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paragraph: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
