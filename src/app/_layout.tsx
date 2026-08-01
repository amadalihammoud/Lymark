import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CaptureProvider } from '@/contexts/capture-context';
import { GalleryProvider } from '@/contexts/gallery-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { colors, typography } from '@/theme';

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
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <GalleryProvider>
          <CaptureProvider>
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
                options={{ title: 'Marca d’água', headerBackTitle: 'Voltar' }}
              />
              <Stack.Screen
                name="settings/permissions"
                options={{ title: 'Permissões', headerBackTitle: 'Voltar' }}
              />
              <Stack.Screen
                name="settings/about"
                options={{ title: 'Sobre o Lymark', headerBackTitle: 'Voltar' }}
              />

              <Stack.Screen
                name="photo/[id]"
                options={{ title: 'Detalhe da foto', headerBackTitle: 'Galeria' }}
              />
            </Stack>
          </CaptureProvider>
        </GalleryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
