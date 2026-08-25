import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, typography } from '@/theme';

/**
 * Um mapa da foto para escolher canto.
 *
 * A grade de quatro botões empilhados (`ChoiceGrid`) diz o nome do canto mas
 * não mostra ONDE ele fica — "Superior direito" é uma frase a ser lida e
 * traduzida em posição pela cabeça de quem escolhe. Aqui o controle tem a
 * forma do que ele controla: um retângulo escuro que se lê como foto, com o
 * canto de cima à direita literalmente em cima e à direita.
 *
 * As palavras continuam inteiras dentro de cada quadrante. Um mapa mudo, só
 * com marcas, obrigaria a adivinhar — e não teria o que anunciar ao leitor de
 * tela.
 *
 * O selecionado NÃO copia o preenchimento âmbar sólido do `ChoiceGrid`: um
 * quadrante pintado de âmbar mente sobre a foto que ele representa, e o âmbar
 * é reservado à ação principal da tela (uma por tela). Aqui o estado se
 * anuncia por borda e cor de texto.
 */
export function QuadrantPicker<T extends string>({
  cells,
  extra,
  value,
  onSelect,
  height = 128,
}: {
  /** Os quatro cantos, na ordem de leitura: cima-esquerda primeiro. */
  cells: { value: T; label: string }[];
  /**
   * Uma quinta escolha que não é um canto.
   *
   * Existe porque a posição do logotipo tem cinco valores, e o padrão salvo é
   * "Junto ao carimbo" — que não é lugar nenhum da foto. Espremê-lo num
   * quadrante apagaria um canto de quem já o tivesse escolhido.
   */
  extra?: { value: T; label: string };
  value: T;
  onSelect: (value: T) => void;
  height?: number;
}) {
  const renderCell = (
    item: { value: T; label: string },
    style: { width: '50%' | '100%'; height: number },
  ) => {
    const isSelected = item.value === value;

    return (
      <Pressable
        key={item.value}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={item.label}
        onPress={() => onSelect(item.value)}
        style={({ pressed }) => [
          styles.cell,
          style,
          pressed && !isSelected ? styles.cellPressed : null,
          isSelected ? styles.cellSelected : null,
        ]}>
        <Text style={[typography.value, styles.label, isSelected ? styles.labelSelected : null]}
          numberOfLines={2}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View accessibilityRole="radiogroup" style={styles.map}>
      <View style={styles.grid}>
        {/* Sem exigir exatamente quatro: uma lista de outro tamanho continua
            se organizando em linhas de dois, em vez de quebrar a tela. */}
        {cells.map((cell) => renderCell(cell, { width: '50%', height: height / 2 }))}
      </View>
      {extra ? renderCell(extra, { width: '100%', height: 44 }) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * O chão escuro é o que faz o controle ser lido como uma foto, e não como
   * mais um cartão de ajuste. É o mesmo tom da barra de abas — o mais escuro
   * do tema.
   */
  map: {
    backgroundColor: colors.tabBar,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: radius.sm,
    // Reservada desde já: sem isto a célula muda de tamanho ao ser escolhida e
    // as vizinhas se mexem junto.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  cellSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  label: {
    textAlign: 'center',
    fontSize: 13,
  },
  labelSelected: {
    color: colors.accent,
    // No Android o peso é uma família à parte: `fontWeight` sozinho não muda
    // nada.
    fontFamily: fontFamily.uiBold,
    fontWeight: '700',
  },
});
