import { useAuth } from '@clerk/expo';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { getExecutionPlatform } from '@/lib/file-storage';
import { colors, spacing, typography } from '@/theme';

import { isAuthConfigured } from './config';
import { useDesktopAuth } from './desktop-auth';
import { DesktopSignIn, SignInFlow } from './sign-in-flow';

/**
 * O portão: a conta é obrigatória desde a primeira abertura.
 *
 * É a regra do §6 do `docs/ASSINATURA.md` — é a conta que faz a cota valer;
 * sem ela o contador seria do aparelho, e aparelho se limpa. Antes deste
 * portão, o botão da landing abria o app web direto e o login era opcional:
 * a cota inteira podia ser gasta sem conta nenhuma.
 *
 * Em desenvolvimento (`__DEV__`), sem chave do Clerk o portão fica aberto:
 * dá para compilar e testar sem segredo. Em produção (`!__DEV__`), sem chave
 * o app **não** abre — mostra tela de bloqueio. No desktop o fluxo de token
 * continua o mesmo.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (getExecutionPlatform() === 'desktop') return <DesktopGate>{children}</DesktopGate>;
  if (!isAuthConfigured) {
    if (__DEV__) return <>{children}</>;
    return <AuthMisconfigured />;
  }
  return <ClerkGate>{children}</ClerkGate>;
}

function AuthMisconfigured() {
  const t = useTranslations('app.account');

  return (
    <Screen>
      <Section title={t('title')}>
        <View style={styles.block}>
          <Text style={[typography.body, styles.note]}>{t('notConfigured')}</Text>
          <Text style={[typography.caption, styles.hint]}>
            Login unavailable / misconfigured — EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY missing.
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Nada de app por baixo enquanto o Clerk decide: mostrar as telas e
  // arrancá-las meio segundo depois pareceria o app quebrando.
  if (!isLoaded) return null;

  return isSignedIn ? <>{children}</> : <SignInFlow />;
}

function DesktopGate({ children }: { children: ReactNode }) {
  const { token, hydrated } = useDesktopAuth();

  if (!hydrated) return null;

  return token ? <>{children}</> : <DesktopSignIn />;
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  note: {
    color: colors.textMuted,
  },
  hint: {
    color: colors.textMuted,
    opacity: 0.8,
  },
});
