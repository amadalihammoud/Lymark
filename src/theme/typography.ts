import type { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Estilos de texto nomeados por função, não por aparência: uma tela pede
 * `typography.label`, nunca "cinza 13px". Trocar a hierarquia tipográfica
 * do app é uma edição aqui.
 */
export const typography = {
  /** Rótulo acima de um campo ("Hora", "Data", "Endereço / Local"). */
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: colors.textMuted,
  },
  /** Conteúdo de um campo. */
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textOnSurface,
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.text,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSubtle,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
