import { useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import type { OAuthStrategy } from '@clerk/shared/types';
// Pela família, e não pelo barril `@expo/vector-icons`: o barril carrega
// TODAS as famílias e some com megabytes no bundle (ver `ui/button.tsx`).
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { FieldRow } from '@/components/ui/field-row';
import { Screen } from '@/components/ui/screen';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

import { useDesktopAuth } from './desktop-auth';

/**
 * As duas telas de entrar — usadas pela rota `/account` e pelo portão de
 * login na raiz (`gate.tsx`), que é o que torna a conta obrigatória desde a
 * primeira abertura, como manda o desenho (`docs/ASSINATURA.md` §6: é a
 * conta que faz a cota valer; sem ela o contador seria do aparelho, e
 * aparelho se limpa).
 *
 * Como é a primeira tela que a pessoa vê, ela também é a abertura do app: a
 * marca, a frase da landing e só depois o formulário. Antes era um cartão de
 * configurações com o título "Conta" — funcionava, mas apresentava o Lymark
 * como um ajuste, não como um produto. A frase e o selo vêm de `site.hero`,
 * que já existe nos 79 idiomas: o catálogo é um só, e reaproveitá-lo é o que
 * garante que a abertura fale a língua de quem abre.
 *
 * Um fluxo só: e-mail, código, sessão. Sem senha de propósito — quem está em
 * campo não vai redefinir senha em cima de um telhado, e o código por e-mail
 * é o que o Clerk oferece que menos pede da pessoa. Entrar e cadastrar são o
 * mesmo caminho: se o e-mail não tem conta, o cadastro acontece por baixo,
 * com as mesmas duas telas.
 *
 * O e-mail vem primeiro e leva o único botão âmbar da tela; o SSO (Google,
 * Facebook, TikTok, via `useSSO` experimental) fica embaixo como três
 * círculos brancos com o logotipo dentro — reconhecíveis sem três frases
 * "Continuar com…" empilhadas disputando com a ação principal. O nome
 * acessível continua sendo a frase completa. O hook já finaliza a sessão
 * quando o OAuth fecha com sucesso; cancelar o navegador não conta como
 * falha.
 *
 * O formulário fica direto sobre o fundo, sem `Section`: a caixa do campo e o
 * cartão da seção têm a mesma cor de superfície, e um dentro do outro sumia —
 * o campo de e-mail parecia um vazio.
 */

type Step = { name: 'email' } | { name: 'code'; via: 'sign-in' | 'sign-up' };

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const SOCIAL_PROVIDERS: {
  strategy: OAuthStrategy;
  labelKey: 'continueWithGoogle' | 'continueWithFacebook' | 'continueWithTikTok';
  icon: IoniconName;
  /** Cor oficial de cada marca, sobre o círculo branco. */
  color: string;
}[] = [
  { strategy: 'oauth_google', labelKey: 'continueWithGoogle', icon: 'logo-google', color: '#4285F4' },
  { strategy: 'oauth_facebook', labelKey: 'continueWithFacebook', icon: 'logo-facebook', color: '#1877F2' },
  { strategy: 'oauth_tiktok', labelKey: 'continueWithTikTok', icon: 'logo-tiktok', color: '#010101' },
];

export function SignInFlow() {
  const t = useTranslations('app.account');
  const tCommon = useTranslations('app.common');
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

  /**
   * Volta ao e-mail. Errou a letra, o código não chegou, quer outra conta:
   * antes, o único caminho era fechar o app. O código digitado é descartado;
   * o e-mail fica, porque quase sempre a correção é de uma letra.
   */
  const backToEmail = () => {
    if (anyBusy) return;
    setCode('');
    setFailed(false);
    setStep({ name: 'email' });
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
    <Screen contentStyle={styles.content}>
      <Opening />

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
            disabled={anyBusy || email.trim().length === 0}
            onPress={() => void requestCode()}
          />

          <View style={styles.separator} accessibilityRole="text">
            <View style={styles.separatorLine} />
            <Text style={[typography.body, styles.separatorLabel]}>{t('orEmail')}</Text>
            <View style={styles.separatorLine} />
          </View>

          <View style={styles.socialRow}>
            {SOCIAL_PROVIDERS.map((provider) => (
              <SocialCircle
                key={provider.strategy}
                label={t(provider.labelKey)}
                icon={provider.icon}
                color={provider.color}
                loading={pendingSocial === provider.strategy}
                disabled={anyBusy && pendingSocial !== provider.strategy}
                onPress={() => void startSocial(provider.strategy)}
              />
            ))}
          </View>
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
          <Button
            label={tCommon('back')}
            variant="ghost"
            disabled={anyBusy}
            onPress={backToEmail}
          />
        </View>
      )}

      {failed ? (
        <Text style={[typography.body, styles.error]} accessibilityLiveRegion="polite">
          {t('failed')}
        </Text>
      ) : null}

      <Reassurance />
    </Screen>
  );
}

/** O entrar do desktop: um botão que abre o navegador — o resto é deep link. */
export function DesktopSignIn() {
  const t = useTranslations('app.account');
  const { signIn } = useDesktopAuth();

  return (
    <Screen contentStyle={styles.content}>
      <Opening />
      <View style={styles.form}>
        <Text style={[typography.body, styles.note]}>{t('browserHint')}</Text>
        <Button label={t('signInBrowser')} variant="accent" onPress={signIn} />
      </View>
      <Reassurance />
    </Screen>
  );
}

/**
 * A abertura: marca, selo e a frase da landing. É a mesma hierarquia do
 * topo de lymark.app — quem chega pelo site reconhece o app na hora.
 */
function Opening() {
  const t = useTranslations('site.hero');

  return (
    <View style={styles.opening}>
      <Wordmark />
      <Text style={[typography.sectionTitle, styles.eyebrow]}>{t('eyebrow')}</Text>
      <Text style={styles.heading}>{t('heading')}</Text>
    </View>
  );
}

/**
 * O rodapé: as duas promessas curtas da landing. Quem hesita em criar conta
 * num app de fotos precisa ler, antes de digitar o e-mail, que as fotos não
 * saem do aparelho.
 */
function Reassurance() {
  const t = useTranslations('site.hero.meta');

  return (
    <Text style={[typography.caption, styles.reassurance]}>
      {t('onDevice')}
      {'  ·  '}
      {t('account')}
    </Text>
  );
}

/**
 * Um provedor de SSO como círculo branco com o logotipo dentro.
 *
 * O indicador de progresso toma o lugar do logotipo, na cor da marca, para
 * que o círculo continue dizendo qual provedor está esperando.
 */
function SocialCircle({
  label,
  icon,
  color,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: IoniconName;
  color: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.circle,
        pressed && styles.circlePressed,
        disabled && styles.circleDisabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Ionicons name={icon} size={28} color={color} />
      )}
    </Pressable>
  );
}

const SOCIAL_CIRCLE = 60;

const styles = StyleSheet.create({
  /**
   * Centrado na altura quando sobra tela, e rolável quando falta (teclado
   * aberto num celular baixo): `flexGrow` sem `flex: 1`, para o conteúdo
   * poder crescer além da janela dentro do `ScrollView`.
   */
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  opening: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  heading: {
    fontFamily: fontFamily.uiBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
    // Limita a medida da linha: uma frase de sete palavras numa linha só,
    // num tablet, deixa de parecer um título e vira uma legenda.
    maxWidth: 360,
  },
  form: {
    gap: spacing.md,
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
    backgroundColor: colors.borderInteractive,
  },
  separatorLabel: {
    color: colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  circle: {
    width: SOCIAL_CIRCLE,
    height: SOCIAL_CIRCLE,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePressed: {
    backgroundColor: colors.textOnSurface,
  },
  circleDisabled: {
    opacity: 0.45,
  },
  note: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  reassurance: {
    textAlign: 'center',
  },
});
