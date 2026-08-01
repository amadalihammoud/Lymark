import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Seletor de opção única em grade.
 *
 * Genérico no valor para servir tanto à posição da marca d'água (2 colunas)
 * quanto ao tamanho do texto (3 colunas), sem duplicar a lógica de seleção.
 */
export function ChoiceGrid<T extends string>({
  options,
  selected,
  onSelect,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  columns?: number;
}) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.option,
              { width: `${100 / columns}%` },
              isSelected && styles.optionSelected,
              pressed && !isSelected && styles.optionPressed,
            ]}>
            <Text
              style={[typography.value, isSelected && styles.labelSelected]}
              numberOfLines={2}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: 0,
  },
  option: {
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
  },
  optionPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
});
