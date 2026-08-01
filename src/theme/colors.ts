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
  slate500: '#6D8299',

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
  border: palette.navy400,

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
  textSubtle: palette.slate500,
  textOnSurface: palette.slate200,

  danger: palette.red400,
  success: palette.green400,

  tabBar: palette.navy900,
  tabBarBorder: palette.navy600,
  tabActive: palette.amber500,
  tabInactive: palette.slate500,

  /** Fundo semitransparente atrás da marca d'água, para garantir leitura. */
  watermarkBackdrop: 'rgba(9, 26, 43, 0.55)',
} as const;

export type ColorToken = keyof typeof colors;
