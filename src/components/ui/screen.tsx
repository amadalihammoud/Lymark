import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

/**
 * Moldura comum a todas as telas: fundo do app, área segura no topo e
 * respiro lateral padrão. Manter isso num só lugar é o que impede cada tela
 * de inventar seu próprio `padding`.
 */
export function Screen({
  children,
  scrollable = true,
  contentStyle,
}: {
  children: ReactNode;
  /** Telas com lista própria (`FlatList`) passam `false` e rolam sozinhas. */
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          // Sem isto, o último campo do formulário fica atrás do teclado e o
          // usuário digita às cegas.
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});
