import type { TextStyle } from 'react-native';

import { colors } from './colors';
import { fontFamily } from './fonts';

/**
 * Estilos de texto nomeados por função, não por aparência: uma tela pede
 * `typography.label`, nunca "cinza 13px". Trocar a hierarquia tipográfica
 * do app é uma edição aqui.
 *
 * Cada estilo traz `fontFamily` junto do `fontWeight`, e os dois têm de
 * concordar: no React Native o `fontWeight` não escolhe entre arquivos de peso
 * registrados separadamente — no Android ele acabaria sintetizando um negrito
 * falso por cima do Regular. Quem carrega o peso é a família; o `fontWeight`
 * fica para o iOS e para a leitura de quem vem depois.
 *
 * A monoespaçada aparece só onde o manual a autoriza: rótulo curto em caixa
 * alta, número, código, legenda técnica. Nunca em texto corrido.
 */
export const typography = {
  /** Rótulo acima de um campo ("Hora", "Data", "Endereço / Local"). */
  label: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: colors.textMuted,
  },
  /** Conteúdo de um campo. */
  value: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  body: {
    fontFamily: fontFamily.uiRegular,
    fontSize: 15,
    fontWeight: '400',
    color: colors.textOnSurface,
  },
  button: {
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
    fontWeight: '700',
  },
  /** Caixa alta e entreletra aberta: é o rótulo técnico do manual. */
  sectionTitle: {
    fontFamily: fontFamily.uiMono,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  screenTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  /*
   * O manual entrega três pesos, e o mais alto é 700 — o 800 que estava aqui
   * não existe em Space Grotesk e virava negrito sintético.
   */
  wordmark: {
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.text,
  },
  tagline: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  caption: {
    fontFamily: fontFamily.uiRegular,
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSubtle,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
