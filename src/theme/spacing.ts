/** Escala de espaçamento em passos de 4. Evita números mágicos nos estilos. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Raios de canto. `pill` arredonda totalmente elementos de altura fixa.
 *
 * Reduzidos na Onda C da auditoria: o raio generoso em todo cartão era a
 * assinatura involuntária de app genérico. A landing usa cantos quase retos
 * e réguas finas — o app passa a falar o mesmo vocabulário. A escala segue
 * proporcional para os cantos internos continuarem menores que os externos.
 */
export const radius = {
  sm: 3,
  md: 5,
  lg: 8,
  pill: 999,
} as const;

/** Altura mínima de alvo de toque recomendada para acessibilidade. */
export const HIT_TARGET = 48;
