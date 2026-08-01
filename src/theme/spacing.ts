/** Escala de espaçamento em passos de 4. Evita números mágicos nos estilos. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Raios de canto. `pill` arredonda totalmente elementos de altura fixa. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Altura mínima de alvo de toque recomendada para acessibilidade. */
export const HIT_TARGET = 48;
