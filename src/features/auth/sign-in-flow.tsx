import { useSignIn, useSignUp } from '@clerk/expo';
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
 */

type Step = { name: 'email' } | { name: 'code'; via: 'sign-in' | 'sign-up' };

export function SignInFlow() {
  const t = useTranslations('app.account');
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ name: 'email' });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * Pede o código. Tenta entrar; se o e-mail não tem conta, cadastra — a
   * pessoa não precisa saber em qual dos dois caiu. A API do Clerk devolve o
   * erro em vez de lançar, e é assim que os dois caminhos se encadeiam.
   */
  const requestCode = async () => {
    if (busy) return;
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
    if (busy || step.name !== 'code') return;
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

  return (
    <Screen>
      <Section title={t('title')}>
        {step.name === 'email' ? (
          <View style={styles.form}>
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
              disabled={email.trim().length === 0}
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
              disabled={code.trim().length === 0}
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
  note: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
});
