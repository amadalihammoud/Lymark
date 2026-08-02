import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { colors, spacing, typography } from '@/theme';

/** Sobre o Lymark — identidade, versão e o compromisso de privacidade. */
export default function AboutScreen() {
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
        <Text style={[typography.body, styles.pitch]}>
          Carimba hora, data, dia da semana, endereço e um código de rastreio nas suas
          fotos — para registro de campo, vistoria e comprovação de serviço.
        </Text>
      </View>

      <Section title="Aplicativo">
        {/* Vem do binário, não do app.json: dois builds da mesma versão
            precisam ser distinguíveis quando alguém relata um problema. */}
        <InfoRow label="Versão" value={appVersion} />
        <InfoRow label="Plataforma" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} />
        <InfoRow
          label="Expo SDK"
          value={config?.sdkVersion ?? '—'}
          showDivider={false}
        />
      </Section>

      <Section title="Privacidade">
        <View style={styles.paragraph}>
          <Text style={typography.body}>
            As fotos, os endereços e o histórico ficam apenas neste aparelho. O Lymark não
            possui servidor, não cria conta e não envia as suas fotos para lugar nenhum.
          </Text>
          <Text style={typography.caption}>
            A localização é usada uma vez por captura, apenas para preencher o campo de
            endereço, e não é armazenada separadamente das fotos.
          </Text>
          {/* Precisão vale mais que uma frase redonda: para virar endereço, a
              coordenada é consultada pelo sistema operacional na rede. Afirmar
              que nada sai do aparelho seria falso — e contradiria a política de
              privacidade publicada do aplicativo. */}
          <Text style={typography.caption}>
            Ao usar o GPS, o sistema operacional envia a coordenada ao serviço de mapas do
            Google ou da Apple para obter o endereço. É a única informação que sai daqui, e
            quem a envia é o sistema, não o Lymark.
          </Text>
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
