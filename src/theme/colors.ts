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
  /**
   * Caixas de campo, cartões e o placeholder da foto.
   *
   * Um passo mais claro do que o fundo já era suficiente numa sala; ao sol
   * forte de uma vistoria, com o brilho no máximo, os dois tons vizinhos
   * viravam uma superfície só e o usuário não achava os campos. Este tom dá
   * separação visível sem clarear a tela a ponto de cansar em ambiente
   * fechado.
   */
  surface: palette.navy500,
  /** Superfície um passo acima — usada em linhas e opções selecionadas. */
  surfaceRaised: palette.navy400,
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
} as const;

export type ColorToken = keyof typeof colors;

/*
 * As cores do carimbo não moram mais aqui.
 *
 * Eram as mesmas da interface, e mudar a barra do carimbo repintava os botões
 * do aplicativo. São perguntas diferentes: uma é a identidade que a empresa
 * imprime na foto, a outra é a identidade da tela. As do carimbo passaram a
 * viver nas preferências, em hexadecimal livre — `STAMP_COLOR_SWATCHES`, em
 * `types`, é hoje só a lista de atalhos do seletor.
 */
