import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslations } from 'use-intl';

import { colors, typography } from '@/theme';

/**
 * A tela de "não carregou" — a mesma para qualquer dependência de arranque.
 *
 * Nasceu no `_layout.tsx` para a falha do Skia e saiu de lá quando o Clerk
 * precisou da mesma coisa: um app que renderiza `null` esperando um serviço
 * que nunca responde é indistinguível de um app que não abriu. Foi
 * exatamente assim que a API nativa desligada no Clerk chegou ao usuário —
 * fundo azul da splash e mais nada. Falha visível e recuperável é melhor que
 * falha invisível.
 *
 * Deliberadamente reaproveita `app.common.error` e `app.common.tryAgain`, que
 * já existem nos 79 idiomas, em vez de acrescentar chave nova: uma mensagem
 * mais específica seria melhor texto, mas nasceria em português e mentiria
 * nos outros até alguém traduzi-la. Tela de falha traduzida pela metade é o
 * defeito que ela mesma deveria denunciar.
 */
export function LoadFailure({ onRetry }: { onRetry: () => void | Promise<void> }) {
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
