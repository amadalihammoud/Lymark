import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

/**
 * A marca do Lymark: o monograma "LY" seguido do nome.
 *
 * O monograma é o SVG do pacote da marca (`assets/brand/`, fonte da
 * verdade), desenhado pelo `expo-image` — que decodifica SVG nas três
 * plataformas — em vez de views: é o mesmo arquivo do site e do studio, e
 * a curva do Y não sobreviveria a retângulos. A proporção 319,75 : 251 é a
 * do `viewBox`, que já traz o respiro de uma haste em volta do desenho.
 */
const MONOGRAM = require('../../../assets/brand/ly-logo-transparente.svg');
const MONOGRAM_ASPECT = 319.75 / 251;

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const height = size === 'sm' ? 32 : 40;

  return (
    <View style={styles.container}>
      <Image
        source={MONOGRAM}
        style={{ width: height * MONOGRAM_ASPECT, height }}
        contentFit="contain"
        accessibilityLabel="Lymark"
      />
      <Text style={[typography.wordmark, size === 'sm' && styles.compactName]}>
        Ly<Text style={styles.nameAccent}>mark</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactName: {
    fontSize: 18,
  },
  nameAccent: {
    color: colors.accent,
  },
});
