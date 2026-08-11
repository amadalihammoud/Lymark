import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Traz o anel de foco do navegador para dentro da caixa.
 *
 * O anel é `outline`, não borda: o navegador o desenha FORA da caixa e ele não
 * ocupa espaço no layout. Com os campos de hora, data e dia lado a lado, o
 * anel de um avançava sobre o vizinho — o que se via como caixas sobrepostas
 * ao selecionar uma delas.
 *
 * Deslocado para dentro, continua igualmente visível, que é o que importa para
 * quem navega por teclado. Some do nativo, onde `outline` não existe.
 */
const FOCUS_RING_INSIDE = Platform.select({
  web: { outlineOffset: -3 } as object,
  default: null,
});

/**
 * Campo rotulado da tela de captura: rótulo discreto em cima, caixa de
 * entrada embaixo.
 *
 * `trailing` encaixa uma ação à direita da caixa sem quebrar o alinhamento —
 * é como o botão "Gerar" convive com o Código de Foto.
 */
export function FieldRow({
  label,
  shortLabel,
  trailing,
  style,
  containerStyle,
  ...inputProps
}: {
  label: string;
  /**
   * Rótulo curto para quando a coluna é estreita.
   *
   * O nome acessível continua sendo o completo: encurtar o texto na tela não
   * pode encurtar o que o leitor de tela anuncia.
   */
  shortLabel?: string;
  trailing?: ReactNode;
  /** Permite a quem usa distribuir o campo numa linha compartilhada. */
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Uma linha só: um rótulo que quebra empurra a caixa para baixo e
          desalinha os campos que dividem a linha com ele. */}
      <Text style={typography.label} numberOfLines={1}>
        {shortLabel ?? label}
      </Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, FOCUS_RING_INSIDE, style]}
          {...inputProps}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    // Ver a nota em `input`: o mesmo piso de largura se aplica à célula, que
    // também é item flex quando os campos ficam lado a lado.
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    // `flex-start` e não `stretch`: com o endereço em modo multiline, esticar
    // faria o botão "Localizar" crescer até virar um retângulo do tamanho do
    // campo.
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    /*
     * Sem este piso, o campo transborda a própria célula.
     *
     * Na web o `TextInput` vira um `<input>`, que tem largura intrínseca de
     * cerca de 170px. Item flex não encolhe abaixo do conteúdo enquanto
     * `min-width` for `auto`, que é o padrão do CSS — então numa linha de três
     * campos, onde a célula da hora recebe menos que isso, o campo invadia o
     * vizinho. A borda de foco só tornava visível o que já acontecia.
     *
     * No nativo o Yoga já trata `minWidth` como zero, então isto não muda nada
     * lá.
     */
    minWidth: 0,
    minHeight: HIT_TARGET + 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // Teto para o campo multiline: um endereço longo não pode empurrar o
    // resto do formulário para fora da tela.
    maxHeight: 132,
    ...typography.value,
  },
});
