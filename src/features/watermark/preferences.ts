import {
  WATERMARK_FIELD_KEYS,
  type WatermarkPreferences,
} from '@/types';

/**
 * O padrão da marca d'água e a reconstrução do que veio do disco.
 *
 * Fica fora do contexto de propósito: são regras puras, e mantê-las aqui
 * evita que qualquer coisa que só precise conhecer o padrão acabe
 * carregando o AsyncStorage junto.
 */

export const DEFAULT_WATERMARK_PREFERENCES: WatermarkPreferences = {
  visibleFields: {
    time: true,
    date: true,
    weekday: true,
    address: true,
    code: true,
  },
  position: 'bottom-left',
  scale: 'medium',
  // Desligada por padrão para reproduzir a referência, onde o texto fica
  // direto sobre a foto e a sombra basta. Continua disponível para fotos
  // muito claras, em que a sombra sozinha não segura o contraste.
  showBackdrop: false,
};

/**
 * Mescla preferências gravadas contra o padrão.
 *
 * Um app atualizado lê dados gravados por uma versão anterior, que não
 * conhecia todos os campos. Sem esta mescla, um `undefined` chegaria na
 * renderização do carimbo.
 */
export function mergeWithDefaults(
  stored: Partial<WatermarkPreferences>,
): WatermarkPreferences {
  const visibleFields = { ...DEFAULT_WATERMARK_PREFERENCES.visibleFields };
  for (const key of WATERMARK_FIELD_KEYS) {
    const value = stored.visibleFields?.[key];
    if (typeof value === 'boolean') visibleFields[key] = value;
  }

  return {
    visibleFields,
    position: stored.position ?? DEFAULT_WATERMARK_PREFERENCES.position,
    scale: stored.scale ?? DEFAULT_WATERMARK_PREFERENCES.scale,
    showBackdrop: stored.showBackdrop ?? DEFAULT_WATERMARK_PREFERENCES.showBackdrop,
  };
}
