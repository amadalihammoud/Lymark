import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useSkiaStatus } from '@/components/skia';
import { AuthProvider } from '@/features/auth/provider';
import { AuthGate } from '@/features/auth/gate';
import { DesktopAuthProvider } from '@/features/auth/desktop-auth';
import { EntitlementSync } from '@/features/auth/entitlement-sync';
import { CaptureProvider } from '@/contexts/capture-context';
import { EntitlementProvider } from '@/contexts/entitlement-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { GalleryProvider } from '@/contexts/gallery-context';
import { LocaleProvider } from '@/contexts/locale-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { colors, typography, watermarkFontAssets } from '@/theme';

// A splash fica na tela até a fonte do carimbo estar pronta. Sem isso, a
// primeira renderização usaria a fonte do sistema e o carimbo "pularia" de
// desenho no meio do uso.
void SplashScreen.preventAutoHideAsync();

/**
 * Raiz da navegação.
 *
 * Os três providers ficam **acima** do `Stack`, e portanto acima das abas.
 * Essa é a decisão que sustenta o critério de aceite do produto: o rascunho
 * de captura vive fora da árvore de telas, então navegar até a Galeria ou
 * entrar em Configurações não desmonta nem reinicia nada — a foto escolhida
 * e os campos preenchidos continuam lá na volta.
 *
 * Ordem importa: `Settings` e `Gallery` são independentes entre si, mas as
 * telas que leem o rascunho quase sempre leem preferências junto, então
 * `Capture` fica por dentro.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(watermarkFontAssets);
  const [skiaStatus, retrySkia] = useSkiaStatus();

  useEffect(() => {
    // Falha ao carregar a fonte não pode prender o usuário na splash: o app
    // segue com a fonte do sistema, que é pior mas funciona.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      {/* Acima de tudo, e acima também da espera pelo Skia: os títulos das
          telas já saem traduzidos, o idioma escolhido vale para qualquer parte
          da árvore — e o aviso de falha abaixo precisa sair traduzido também.
          O idioma não depende do Skia. */}
      <LocaleProvider>
        {/*
         * Na web o Skia chega como WebAssembly e o carregamento é assíncrono;
         * no nativo esta espera resolve de imediato. Segurar a árvore é o que
         * evita a corrida: `useStampFontProvider` roda no efeito de montagem e
         * pedia os typefaces antes de o CanvasKit existir, com "Cannot read
         * properties of undefined (reading 'Typeface')" — as fontes do carimbo
         * nunca chegavam a ser registradas. Por isso a falha não pode
         * simplesmente seguir adiante.
         *
         * Mas ela também não pode virar tela vazia, que era o caso: um `return
         * null` no estado `failed` deixava o app sem uma palavra na tela, e
         * indistinguível de um app que não carregou. Foi exatamente assim que o
         * 404 do `canvaskit.wasm` chegou ao usuário — sem mensagem, sem pista.
         * A mesma razão que fez a falha de fonte não prender ninguém na splash
         * vale aqui: falha visível e recuperável é melhor que falha invisível.
         */}
        {skiaStatus === 'failed' ? (
          <SkiaFailure onRetry={retrySkia} />
        ) : skiaStatus !== 'ready' ? null : (
          /* Acima das telas e fora da árvore de captura: o direito de acesso
             não pode ser remontado ao navegar entre abas. */
          <AuthProvider>
          <DesktopAuthProvider>
          <EntitlementProvider>
            {/* A ponte identidade → entitlement: precisa dos dois providers
                acima, e de mais nenhum. */}
            <EntitlementSync />
            <SettingsProvider>
              <GalleryProvider>
                <CaptureProvider>
                  {/* Acima da navegação: o diálogo e o aviso precisam cobrir
                      qualquer tela, inclusive as que abrem por cima. */}
                  <FeedbackProvider>
                    <StatusBar style="light" />
                    {/* O portão de login: sem sessão, nada de app — a conta é
                        obrigatória desde a primeira abertura (§6). */}
                    <AuthGate>
                      <Navigation />
                    </AuthGate>
                  </FeedbackProvider>
                </CaptureProvider>
              </GalleryProvider>
            </SettingsProvider>
          </EntitlementProvider>
          </DesktopAuthProvider>
          </AuthProvider>
        )}
      </LocaleProvider>
    </SafeAreaProvider>
  );
}

/**
 * O que aparece quando o Skia não carrega.
 *
 * Deliberadamente reaproveita `app.common.error` e `app.common.tryAgain`, que
 * já existem nos doze idiomas, em vez de acrescentar chave nova: uma mensagem
 * mais específica seria melhor texto, mas nasceria em português e mentiria nos
 * outros onze até alguém traduzi-la. Tela de falha traduzida pela metade é o
 * defeito que ela mesma deveria denunciar.
 */
function SkiaFailure({ onRetry }: { onRetry: () => Promise<void> }) {
  const t = useTranslations('app.common');

  return (
    <View style={styles.failure}>
      <StatusBar style="light" />
      <Text style={typography.screenTitle}>{t('error')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tryAgain')}
        onPress={() => void onRetry()}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
        <Text style={typography.value}>{t('tryAgain')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  failure: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.background,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 6,
  },
  retryPressed: {
    backgroundColor: colors.surfaceRaised,
  },
});

/**
 * A pilha de telas, separada da raiz por um motivo só: `useTranslations`
 * precisa estar **dentro** do `LocaleProvider`, e a raiz é quem o monta.
 */
function Navigation() {
  const t = useTranslations('app');
  const router = useRouter();

  /**
   * O menu do sistema, no desktop, pede rotas por IPC.
   *
   * A navegação passa pelo roteador, e não por recarregamento da página:
   * recarregar descartaria o rascunho de captura — a foto escolhida e os
   * campos preenchidos — que é o que o app promete não perder ao navegar.
   */
  useEffect(() => {
    globalThis.window?.lymark?.onNavigate?.((route) => {
      router.navigate(route as Parameters<typeof router.navigate>[0]);
    });
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerTitleStyle: typography.value,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen
        name="settings/watermark"
        options={{ title: t('settings.watermark'), headerBackTitle: t('common.back') }}
      />
      <Stack.Screen
        name="settings/permissions"
        options={{ title: t('permissions.title'), headerBackTitle: t('common.back') }}
      />
      <Stack.Screen
        name="settings/about"
        options={{ title: t('about.title'), headerBackTitle: t('common.back') }}
      />
      <Stack.Screen
        name="account"
        options={{ title: t('account.title'), headerBackTitle: t('common.back') }}
      />
      <Stack.Screen
        name="settings/language"
        options={{ title: t('language.label'), headerBackTitle: t('common.back') }}
      />

      <Stack.Screen
        name="photo/[id]"
        options={{ title: t('nav.photoDetail'), headerBackTitle: t('gallery.title') }}
      />

      {/* Processamento em lote - apenas desktop */}
      <Stack.Screen
        name="batch"
        options={{ title: t('nav.batch'), headerBackTitle: t('common.back') }}
      />
    </Stack>
  );
}