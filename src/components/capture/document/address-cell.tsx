// Importado pela família, e não pelo barril `@expo/vector-icons`: o barril
// carrega TODAS as famílias de ícones e some com megabytes no bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FIELD_MAX_LENGTH } from '@/components/capture/field-limits';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Traz o anel de foco do navegador para dentro da caixa.
 *
 * Copiado de `field-row.tsx` em vez de importado: é detalhe interno daquele
 * componente, e exportá-lo só para reusar aqui transformaria uma correção
 * local em contrato público.
 */
const FOCUS_RING_INSIDE = Platform.select({
  web: { outlineOffset: -3 } as object,
  default: null,
});

/** A largura da capa: cabe a seta com respiro, e nada mais. */
const FADE_WIDTH = 34;

/**
 * O endereço na régua: uma linha só, com sinal de que há mais texto.
 *
 * É a única célula que o `FieldRow` não dá. Na régua todos os campos têm a
 * mesma altura — é o que faz a linha se ler como uma linha —, e o endereço é
 * justamente o campo que não cabe: "Av. Puglisi, 490 - Centro, Guarujá - SP,
 * 11410-002" passa de qualquer largura razoável.
 *
 * Cortar em silêncio seria pior que apertar: quem olha não saberia que há
 * texto além da borda. Então a caixa é de uma linha (`multiline={false}`, que
 * também é o que garante a altura constante de que o cálculo do documento
 * depende) e o fim dela recebe uma capa com uma seta — o mesmo sinal que
 * planilha e tabela usam há décadas para dizer "continua para o lado".
 *
 * A capa é um bloco sólido, e não um degradê: nem `expo-linear-gradient` nem
 * `react-native-svg` estão nas dependências do app, e trazer uma delas por 34
 * pixels de transição custaria um rebuild nativo no celular.
 */
export function AddressCell({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  containerStyle,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={typography.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          editable={editable}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          maxLength={FIELD_MAX_LENGTH.address}
          // Requisito, não estética: multiline mudaria de altura conforme o
          // texto, e a altura da régua é constante reservada.
          multiline={false}
          style={[styles.input, FOCUS_RING_INSIDE]}
        />
        {/* Fora da árvore de acessibilidade e sem captura de toque: é sinal
            visual, não conteúdo nem controle. Quem usa leitor de tela já
            recebe o texto inteiro pelo próprio campo. */}
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={styles.fade}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    position: 'relative',
  },
  input: {
    flex: 1,
    // Ver a nota em `field-row.tsx`: sem este piso o campo transborda a
    // própria célula na web, onde o `<input>` tem largura intrínseca.
    minWidth: 0,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    // O texto para antes da capa, em vez de correr por baixo dela.
    paddingRight: FADE_WIDTH,
    ...typography.value,
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.sm,
    backgroundColor: colors.surface,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
});
