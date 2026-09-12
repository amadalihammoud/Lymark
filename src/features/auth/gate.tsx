import { useAuth } from '@clerk/expo';
import { useEffect, useState, type ReactNode } from 'react';
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

/**
 * Quanto o Clerk tem para carregar antes de o portão parar de ficar mudo.
 *
 * Numa rede normal ele responde em menos de um segundo; o limite alto é
 * folga para 3G ruim, não expectativa.
 */
const CLERK_LOAD_TIMEOUT_MS = 8000;

function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Nada de app por baixo enquanto o Clerk decide: mostrar as telas e
  // arrancá-las meio segundo depois pareceria o app quebrando.
  //
  // Mas "nada" tem prazo. O Clerk não avisa quando falha ao iniciar — sem
  // rede, ou com a API nativa desligada no painel da instância, `isLoaded`
  // fica `false` para sempre e a pessoa fica olhando o fundo da tela. Passado
  // o prazo, o portão diz o que está acontecendo.
  if (!isLoaded) return timedOut ? <AuthUnavailable /> : null;

  return isSignedIn ? <>{children}</> : <SignInFlow />;
}

function AuthUnavailable() {
  const t = useTranslations('app.account');

  return (
    <Screen>
      <Section title={t('title')}>
        <View style={styles.block}>
          <Text style={[typography.body, styles.note]}>{t('loadFailed')}</Text>
        </View>
      </Section>
    </Screen>
  );
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
