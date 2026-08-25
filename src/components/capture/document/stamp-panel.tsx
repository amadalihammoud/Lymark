import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslations } from 'use-intl';

import {
  CodePlacementControl,
  WatermarkControls,
  WatermarkFieldToggles,
} from '@/components/settings/watermark-controls';
import { colors, spacing, typography } from '@/theme';

/**
 * O painel lateral: só a APARÊNCIA do carimbo.
 *
 * A divisão que sustenta o desenho do documento é esta: o que SAI carimbado
 * (hora, endereço, código) se edita na régua, colada à foto; como isso se
 * PARECE se ajusta aqui, à parte. Antes as duas coisas dividiam colunas
 * vizinhas e nada dizia qual era qual.
 *
 * Os interruptores de campo descem para o fim: na tela larga anterior eles
 * moravam junto do formulário — cada um ligando um campo logo acima —, e essa
 * vizinhança acabou com a coluna de dados. No fim do painel eles se leem como
 * o que passaram a ser: o que entra e o que fica de fora.
 */
export function StampPanel() {
  const t = useTranslations('app');

  return (
    <View style={styles.panel}>
      <Text style={[typography.sectionTitle, styles.title]}>
        {t('settings.watermarkSection')}
      </Text>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <WatermarkControls includeFields={false} includeReset={false} positionAsMap />
        <WatermarkFieldToggles />
        <CodePlacementControl />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    // Largura de leitura para controles: mais que isto e as grades de cor
    // ficam esparramadas, menos e os rótulos de canto quebram em três linhas.
    width: 320,
    flexShrink: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  title: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
