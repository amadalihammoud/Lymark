import { colors, stampPalette } from '@/theme/colors';

import type { StampColors } from './stamp-layout';

/**
 * As cores do carimbo, isoladas de qualquer componente.
 *
 * Ficam aqui, e não em `stamp-canvas.tsx`, porque o harness de fidelidade
 * precisa desenhar o carimbo fora do aparelho — e um módulo que importa
 * componentes do Skia não carrega em Node. Separando, o app e o harness
 * consomem a mesma constante em vez de manter duas cópias que divergem em
 * silêncio.
 */
export const STAMP_COLORS: StampColors = {
  text: colors.text,
  accent: colors.accent,
  backdrop: colors.watermarkBackdrop,
  palette: stampPalette,
};
