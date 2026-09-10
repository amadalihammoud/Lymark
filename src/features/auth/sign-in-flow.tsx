import { useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import type { OAuthStrategy } from '@clerk/shared/types';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { colors, spacing, typography } from '@/theme';

import { useDesktopAuth } from './desktop-auth';

/**
 * As duas telas de entrar — usadas pela rota `/account` e pelo portão de
 * login na raiz (`gate.tsx`), que é o que torna a conta obrigatória desde a
 * primeira abertura, como manda o desenho (`docs/ASSINATURA.md` §6: é a
 * conta que faz a cota valer; sem ela o contador seria do aparelho, e
 * aparelho se limpa).
 *
 * Um fluxo só: e-mail, código, sessão. Sem senha de propósito — quem está em
 * campo não vai redefinir senha em cima de um telhado, e o código por e-mail
 * é o que o Clerk oferece que menos pede da pessoa. Entrar e cadastrar são o
 * mesmo caminho: se o e-mail não tem conta, o cadastro acontece por baixo,
 * com as mesmas duas telas.
 *
 * No passo do e-mail também há SSO (Google, Facebook, TikTok) via
 * `useSSO` experimental — o hook já finaliza a sessão quando o OAuth fecha
 * com sucesso. Cancelar o navegador não conta como falha.
 */

type Step = { name: 'email' } | { name: 'code'; via: 'sign-in' | 'sign-up' };

type IoniconName = NonNullable<ComponentProps<typeof Button>['icon']>;

const SOCIAL_PROVIDERS: {
  strategy: OAuthStrategy;
  labelKey: 'continueWithGoogle' | 'continueWithFacebook' | 'continueWithTikTok';
  icon: IoniconName;
}[] = [
  { strategy: 'oauth_google', labelKey: 'continueWithGoogle', icon: 'logo-google' },
  { strategy: 'oauth_facebook', labelKey: 'continueWithFacebook', icon: 'logo-facebook' },
  { strategy: 'oauth_tiktok', labelKey: 'continueWithTikTok', icon: 'logo-tiktok' },
];

export function SignInFlow() {
  const t = useTranslations('app.account');
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ name: 'email' });
  const [busy, setBusy] = useState(false);
  const [pendingSocial, setPendingSocial] = useState<OAuthStrategy | null>(null);
  const [failed, setFailed] = useState(false);
  const anyBusy = busy || pendingSocial !== null;

  /**
   * Pede o código. Tenta entrar; se o e-mail não tem conta, cadastra — a
   * pessoa não precisa saber em qual dos dois caiu. A API do Clerk devolve o
   * erro em vez de lançar, e é assim que os dois caminhos se encadeiam.
   */
  const requestCode = async () => {
    if (anyBusy) return;
    setBusy(true);
    setFailed(false);
    try {
      const sent = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (!sent.error) {
        setStep({ name: 'code', via: 'sign-in' });
        return;
      }

      // Conta inexistente (ou fator indisponível): o caminho vira cadastro.
      const created = await signUp.create({ emailAddress: email.trim() });
      if (created.error) {
        setFailed(true);
        return;
      }
      const requested = await signUp.verifications.sendEmailCode();
      if (requested.error) {
        setFailed(true);
        return;
      }
      setStep({ name: 'code', via: 'sign-up' });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (anyBusy || step.name !== 'code') return;
    setBusy(true);
    setFailed(false);
    try {
      if (step.via === 'sign-in') {
        const verified = await signIn.emailCode.verifyCode({ code: code.trim() });
        if (verified.error) {
          setFailed(true);
          return;
        }
        await signIn.finalize();
      } else {
        const verified = await signUp.verifications.verifyEmailCode({ code: code.trim() });
        if (verified.error) {
          setFailed(true);
          return;
        }
        await signUp.finalize();
      }
      // Com a sessão ativa, `EntitlementSync` busca o entitlement sozinho.
    } finally {
      setBusy(false);
    }
  };

  const startSocial = async (strategy: OAuthStrategy) => {
    if (anyBusy) return;
    setPendingSocial(strategy);
    setFailed(false);
    try {
      const { authSessionResult } = await startSSOFlow({ strategy });
      // Cancelar / fechar o navegador: não é falha — só sai sem marcar erro.
      if (authSessionResult && authSessionResult.type !== 'success') return;
    } catch {
      setFailed(true);
    } finally {
      setPendingSocial(null);
    }
  };

  return (
    <Screen>
      <Section title={t('title')}>
        {step.name === 'email' ? (
          <View style={styles.form}>
            <View style={styles.social}>
              {SOCIAL_PROVIDERS.map((provider) => (
                <Button
                  key={provider.strategy}
                  label={t(provider.labelKey)}
                  icon={provider.icon}
                  variant="primary"
                  loading={pendingSocial === provider.strategy}
                  disabled={anyBusy && pendingSocial !== provider.strategy}
                  onPress={() => void startSocial(provider.strategy)}
                />
              ))}
            </View>
            <View style={styles.separator} accessibilityRole="text">
              <View style={styles.separatorLine} />
              <Text style={[typography.body, styles.separatorLabel]}>{t('orEmail')}</Text>
              <View style={styles.separatorLine} />
            </View>
            <FieldRow
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              autoFocus
            />
            <Button
              label={t('continue')}
              variant="accent"
              loading={busy}
              disabled={anyBusy || email.trim().length === 0}
              onPress={() => void requestCode()}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[typography.body, styles.note]}>
              {t('codeSent', { email: email.trim() })}
            </Text>
            <FieldRow
              label={t('code')}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button
              label={t('verify')}
              variant="accent"
              loading={busy}
              disabled={anyBusy || code.trim().length === 0}
              onPress={() => void verify()}
            />
          </View>
        )}
        {failed ? (
          <Text style={[typography.body, styles.error]}>{t('failed')}</Text>
        ) : null}
      </Section>
    </Screen>
  );
}

/** O entrar do desktop: um botão que abre o navegador — o resto é deep link. */
export function DesktopSignIn() {
  const t = useTranslations('app.account');
  const { signIn } = useDesktopAuth();

  return (
    <Screen>
      <Section title={t('title')}>
        <Text style={[typography.body, styles.note]}>{t('browserHint')}</Text>
        <Button label={t('signInBrowser')} variant="accent" onPress={signIn} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  social: {
    gap: spacing.sm,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  separatorLabel: {
    color: colors.textMuted,
  },
  note: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
});
