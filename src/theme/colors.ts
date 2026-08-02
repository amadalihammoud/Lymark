/**
 * Paleta do Lymark.
 *
 * `palette` guarda os tons crus e nunca deve ser importada pelas telas.
 * A UI consome apenas `colors`, que dá nome ao *papel* de cada tom — assim
 * um ajuste de identidade visual acontece neste arquivo, e não espalhado
 * por dezenas de `StyleSheet`.
 */
const palette = {
  navy900: '#091A2B',
  navy800: '#0D2137',
  navy700: '#122B44',
  navy600: '#16324F',
  navy500: '#1B3D60',
  navy400: '#23496E',

  blue600: '#1B5490',
  blue500: '#215F9E',
  blue400: '#2A6DAE',

  amber500: '#F5B60D',
  amber600: '#D99E05',

  white: '#FFFFFF',
  slate200: '#C7D6E4',
  slate400: '#93A9C0',
  slate300: '#8DA4BA',
  slate350: '#7C90A6',
  blue300: '#4A76A1',

  red400: '#E5645B',
  green400: '#4FB477',
} as const;

export const colors = {
  /** Fundo das telas. */
  background: palette.navy800,
  /** Caixas de campo, cartões e o placeholder da foto. */
  surface: palette.navy600,
  /** Superfície um passo acima — usada em linhas selecionadas. */
  surfaceRaised: palette.navy500,
  /** Divisores de lista — decorativos, isentos de razão de contraste. */
  border: palette.navy400,
  /**
   * Contorno de botão. Separado de `border` porque aqui a linha é a única
   * coisa que identifica o elemento como botão — os variantes `ghost` e
   * `danger` têm fundo transparente. A 1,74:1 do navy sumia ao sol; este tom
   * dá 3,41:1, acima do mínimo de 3:1 para elemento de interface.
   */
  borderInteractive: palette.blue300,

  /** Ações de captura ("Tirar foto", "Escolher da galeria", "Gerar"). */
  primary: palette.blue500,
  primaryPressed: palette.blue600,
  primaryAlt: palette.blue400,

  /** Ação de destaque — exportar. */
  accent: palette.amber500,
  accentPressed: palette.amber600,
  onAccent: palette.navy900,

  text: palette.white,
  textMuted: palette.slate400,
  /** 5,08:1 sobre `surface` — antes 3,31:1, reprovado. */
  textSubtle: palette.slate300,
  textOnSurface: palette.slate200,

  danger: palette.red400,
  success: palette.green400,

  tabBar: palette.navy900,
  tabBarBorder: palette.navy600,
  tabActive: palette.amber500,
  tabInactive: palette.slate350,

  /**
   * Alfa 0,75 e não 0,55: sobre uma parede branca ao sol, a faixa a 55%
   * deixava o endereço em 3,96:1 — abaixo do mínimo legível. A 75% sobe
   * para 7,85:1.
   */
  watermarkBackdrop: 'rgba(9, 26, 43, 0.75)',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Cores que a marca própria pode usar no carimbo.
 *
 * Paleta fechada e curta de propósito: sobre asfalto, areia ou parede clara,
 * boa parte do espectro simplesmente desaparece. Estas seis foram escolhidas
 * para funcionar com a sombra que o carimbo já aplica — o preto inclusive,
 * que só é legível por causa dela.
 */
export const stampPalette = {
  white: '#FFFFFF',
  amber: colors.accent,
  red: '#FF6B57',
  green: '#5BD98A',
  blue: '#63B3ED',
  black: '#111820',
} as const;
