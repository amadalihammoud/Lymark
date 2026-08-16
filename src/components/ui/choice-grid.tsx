import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_TARGET, colors, fontFamily, radius, spacing, typography } from '@/theme';

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
  /**
   * O selecionado se anuncia por preenchimento, e não só por borda.
   *
   * Antes a diferença era um tom vizinho mais uma linha âmbar de 2 px — some
   * ao bater o olho, e some de vez sob sol forte. O âmbar sólido com texto
   * escuro é a mesma hierarquia que o botão Salvar usa: é a escolha ativa.
   */
  optionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  labelSelected: {
    color: colors.onAccent,
    fontFamily: fontFamily.uiBold,
    fontWeight: '700',
  },
});
