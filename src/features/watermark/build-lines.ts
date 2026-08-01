import {
  WATERMARK_FIELD_KEYS,
  type CaptureMetadata,
  type WatermarkFieldKey,
  type WatermarkPreferences,
} from '@/types';

/**
 * Decide o texto que será carimbado.
 *
 * Única fonte de verdade para o conteúdo da marca d'água: o preview na tela
 * de captura, o preview em Configurações e a imagem exportada chamam todos
 * esta função, então os três nunca divergem.
 *
 * Um campo entra na foto quando está ligado nas preferências **e** tem valor —
 * campo vazio não vira linha em branco sobre a imagem.
 */

/** Prefixos que dão sentido a um valor que sozinho seria críptico. */
const PREFIXES: Partial<Record<WatermarkFieldKey, string>> = {
  code: 'Cód. ',
};

export function buildWatermarkLines(
  metadata: CaptureMetadata,
  preferences: WatermarkPreferences,
): string[] {
  return WATERMARK_FIELD_KEYS.filter((key) => preferences.visibleFields[key])
    .map((key) => {
      const value = metadata[key].trim();
      if (!value) return null;
      return `${PREFIXES[key] ?? ''}${value}`;
    })
    .filter((line): line is string => line !== null);
}
