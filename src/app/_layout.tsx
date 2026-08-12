import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ClerkProvider, SignedIn, SignedOut, Redirect } from '@clerk/clerk-expo';
import { useWaitForSkia } from '@/components/skia';
import { CaptureProvider } from '@/contexts/capture-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { GalleryProvider } from '@/contexts/gallery-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { SubscriptionGate } from '@/lib/subscription';
import { colors, typography, watermarkFontAssets } from '@/theme';

// A splash fica na tela ate a fonte do carimbo estar pronta. Sem isso, a
// primeira renderizacao usaria a fonte do sistema e o carimbo "pularia" de
// desenho no meio do uso.
void SplashScreen.preventAutoHideAsync();

/**
 * Raiz da navegacao.
 *
 * Os tres providers ficam **acima** do Stack, e portanto acima das abas.
 * Essa e a decisao que sustenta o criterio de aceite do produto: o rascunho
 * de captura vive fora da arvore de telas, entao navegar ate a Galeria ou
 * entrar em Configuracoes nao desmonta nem reinicia nada — a foto escolhida
 * e os campos preenchidos continuam la na volta.
 *
 * Ordem importa: Settings e Gallery sao independentes entre si, mas as
 * telas que leem o rascunho quase sempre leem preferencias junto, entao
 * Capture fica por dentro.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(watermarkFontAssets);
  const skiaReady = useWaitForSkia();

  useEffect(() => {
    // Falha ao carregar a fonte nao pode prender o usuario na splash: o app
    // segue com a fonte do sistema, que e pior mas funciona.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  // Na web o Skia chega como WebAssembly e o carregamento e assincrono; no
  // nativo esta espera resolve de imediato. Segurar a arvore aqui e o que
  // evita a corrida: useStampFontProvider roda no efeito de montagem e
  // pedia os typefaces antes de o CanvasKit existir, com
  // "Cannot read properties of undefined (reading Typeface)" — as fontes
  // do carimbo nunca chegavam a ser registradas.
  if (!skiaReady) return null;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        <SignedIn>
          <SubscriptionGate>
            <SettingsProvider>
              <GalleryProvider>
                <CaptureProvider>
                  <FeedbackProvider>
                    <StatusBar style="light" />
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
                        options={{ title: 'Marca d\'água', headerBackTitle: 'Voltar' }}
                      />
                      <Stack.Screen
                        name="settings/permissions"
                        options={{ title: 'Permissoes', headerBackTitle: 'Voltar' }}
                      />
                      <Stack.Screen
                        name="settings/about"
                        options={{ title: 'Sobre o Lymark', headerBackTitle: 'Voltar' }}
                      />

                      <Stack.Screen
                        name="photo/[id]"
                        options={{ title: 'Detalhe da foto', headerBackTitle: 'Galeria' }}
                      />

                      <Stack.Screen
                        name="batch"
                        options={{ title: 'Processamento em Lote', headerBackTitle: 'Voltar' }}
                      />
                    </Stack>
                  </FeedbackProvider>
                </CaptureProvider>
              </GalleryProvider>
            </SettingsProvider>
          </SubscriptionGate>
        </SignedIn>
        <SignedOut>
          <Redirect href="/login" />
        </SignedOut>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
