import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useWaitForSkia } from '@/components/skia';
import { CaptureProvider } from '@/contexts/capture-context';
import { ClerkProvider } from '@/contexts/clerk-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { GalleryProvider } from '@/contexts/gallery-context';
import { I18nProvider } from '@/contexts/i18n-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { colors, typography, watermarkFontAssets } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(watermarkFontAssets);
  const skiaReady = useWaitForSkia();

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
  if (!skiaReady) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ClerkProvider>
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
                    <Stack.Screen name="settings/watermark" options={{ title: 'Marca dagua', headerBackTitle: 'Voltar' }} />
                    <Stack.Screen name="settings/permissions" options={{ title: 'Permissoes', headerBackTitle: 'Voltar' }} />
                    <Stack.Screen name="settings/about" options={{ title: 'Sobre o Lymark', headerBackTitle: 'Voltar' }} />
                    <Stack.Screen name="photo/[id]" options={{ title: 'Detalhe da foto', headerBackTitle: 'Galeria' }} />
                    <Stack.Screen name="batch" options={{ title: 'Processamento em Lote', headerBackTitle: 'Voltar' }} />
                  </Stack>
                </FeedbackProvider>
              </CaptureProvider>
            </GalleryProvider>
          </SettingsProvider>
        </ClerkProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}