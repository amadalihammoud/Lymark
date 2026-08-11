// Importado pela família, e não pelo barril `@expo/vector-icons`: o barril
// carrega TODAS as famílias de ícones e some com megabytes no bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/brand/app-header';
import { useLayoutMode } from '@/lib/breakpoints';
import { isWeb } from '@/lib/file-storage';
import { colors } from '@/theme';

/**
 * As três áreas do app.
 *
 * Usamos as `Tabs` em JavaScript do expo-router, e não as `NativeTabs`
 * experimentais: a barra precisa seguir a identidade do Lymark (fundo navy,
 * ativo em âmbar) em iOS e Android igualmente, e as abas nativas não
 * permitem esse controle de cor.
 *
 * As telas das abas permanecem montadas ao trocar de aba; somando isso ao
 * `CaptureProvider` na raiz, nem o estado nem a posição de rolagem se perdem.
 */
export default function TabsLayout() {
  const mode = useLayoutMode();
  const phone = mode === 'phone';

  return (
    <View style={styles.root}>
      {/*
        Na tela larga a marca vira uma barra que atravessa a janela, com as
        abas logo abaixo. A barra inferior é idioma de celular: mantida num
        monitor, é o que mais faz a tela parecer um telefone ampliado.
      */}
      {phone ? null : <AppBar tagline="Marca d’água com hora, data e local" />}

      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarPosition: phone ? 'bottom' : 'top',
          tabBarStyle: phone ? styles.tabBar : styles.tabBarTop,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Capturar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="camera" size={size} color={color} />
            ),
          }}
        />
        {/*
          Na web não existe histórico: a foto é carimbada e baixada, e nada é
          guardado (decisão 2.2 — o navegador pode descartar o armazenamento
          sem aviso, e perder um comprovante é inaceitável).

          A aba continua registrada para não quebrar link direto ou navegação
          programática; o que some é a entrada na barra. Sem isto, a web
          mostrava uma galeria sempre vazia — ou, pior, cheia de miniaturas
          quebradas.

          `isWeb()` distingue navegador de Electron: no desktop o histórico
          existe, em pasta real no disco. `Platform.OS` não serve, porque
          também é 'web' dentro do Electron.
        */}
        <Tabs.Screen
          name="gallery"
          options={{
            title: 'Galeria',
            href: isWeb() ? null : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="images" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Configurações',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-sharp" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
  },
  tabBarTop: {
    backgroundColor: colors.tabBar,
    // A separação agora é embaixo: a barra passou para cima do conteúdo.
    borderTopWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarBorder,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
