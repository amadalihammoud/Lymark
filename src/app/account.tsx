import { useAuth, useUser } from '@clerk/expo';
import { Linking, StyleSheet, Text } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useEntitlement } from '@/contexts/entitlement-context';
import { isAuthConfigured } from '@/features/auth/config';
import { useDesktopAuth } from '@/features/auth/desktop-auth';
import { DesktopSignIn, SignInFlow } from '@/features/auth/sign-in-flow';
import { getExecutionPlatform } from '@/lib/file-storage';
import { colors, typography } from '@/theme';

/**
 * A conta — o estado da sessão e do plano.
 *
 * As telas de entrar moram em `features/auth/sign-in-flow.tsx`, porque o
 * portão da raiz (`gate.tsx`) usa as mesmas: com a conta obrigatória, quem
 * chega aqui deslogado é exceção (sessão caiu no meio do uso), não regra.
 *
 * Sem chave do Clerk o app continua inteiro — só esta tela explica que o
 * login ainda não chegou. É a mesma degradação do site, pelo mesmo motivo.
 */
export default function AccountScreen() {
  const t = useTranslations('app.account');

  // No desktop o login mora no navegador (deep link) — nunca no Clerk local.
  if (getExecutionPlatform() === 'desktop') return <DesktopAccount />;

  if (!isAuthConfigured) {
    return (
      <Screen>
        <Section title={t('title')}>
          <Text style={[typography.body, styles.note]}>{t('notConfigured')}</Text>
        </Section>
      </Screen>
    );
  }

  // Os hooks do Clerk só existem daqui para baixo — ver `auth/provider.tsx`.
  return <AccountBody />;
}

function DesktopAccount() {
  const t = useTranslations('app');
  const { token, signOut } = useDesktopAuth();
  const { access } = useEntitlement();

  if (!token) return <DesktopSignIn />;

  return (
    <Screen>
      <Section title={t('account.title')}>
        <Text style={[typography.body, styles.note]}>{t('account.connected')}</Text>
        <PlanLine access={access} />
        <Button label={t('account.signOut')} variant="danger" onPress={signOut} />
        <Button
          label={t('account.deleteAccount')}
          variant="danger"
          onPress={() => void globalThis.window?.lymark?.openAccountPage?.('delete')}
        />
      </Section>
    </Screen>
  );
}

function AccountBody() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <SignedIn /> : <SignInFlow />;
}

function SignedIn() {
  const t = useTranslations('app');
  const { signOut } = useAuth();
  const { user } = useUser();
  const { access } = useEntitlement();

  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <Screen>
      <Section title={t('account.title')}>
        <Text style={[typography.body, styles.note]}>
          {t('account.signedInAs', { email })}
        </Text>
        <PlanLine access={access} />
        <Button
          label={t('account.signOut')}
          variant="danger"
          onPress={() => void signOut()}
        />
        {/* A exclusão acontece no site (§8.5 explica o que sai e o que fica);
            daqui vai o caminho — as lojas exigem que ele exista no app. */}
        <Button
          label={t('account.deleteAccount')}
          variant="danger"
          onPress={() => void Linking.openURL('https://lymark.app/conta/excluir')}
        />
      </Section>
    </Screen>
  );
}

/** A mesma fração das Configurações: "11/12" se lê em qualquer idioma. */
function PlanLine({ access }: { access: { quota: number | null; remaining: number | null } }) {
  const t = useTranslations('app.plan');
  return (
    <Text style={[typography.body, styles.note]}>
      {t('title')}:{' '}
      {access.quota === null ? t('pro') : `${t('free')} · ${access.remaining}/${access.quota}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.textMuted,
  },
});
