import { WATERMARK_FIELD_KEYS, type WatermarkPreferences } from '@/types';

/**
 * O padrão da marca d'água e a reconstrução do que veio do disco.
 *
 * Fica fora do contexto de propósito: são regras puras, e mantê-las aqui
 * evita que qualquer coisa que só precise conhecer o padrão acabe
 * carregando o AsyncStorage junto.
 */

/**
 * Versão do formato salvo.
 *
 * A 1 nasceu com o carimbo em cinco linhas iguais, faixa escura ligada e
 * código impresso. A 2 acompanha o layout de referência: sem faixa, sem
 * código. Trocar o padrão sozinho não bastaria — quem já tinha o app
 * instalado carrega o valor antigo gravado, que nunca foi escolha dele.
 */
export const PREFERENCES_SCHEMA_VERSION = 2;

/** Campos cujo padrão mudou na versão 2 e por isso são remigrados. */
const RESET_ON_UPGRADE = ['showBackdrop', 'code'] as const;

export const DEFAULT_WATERMARK_PREFERENCES: WatermarkPreferences = {
  visibleFields: {
    time: true,
    date: true,
    weekday: true,
    address: true,
    // O layout de referência não carimba o código. Continua a um toque de
    // distância em Configurações, para quem precisa de rastreio na imagem.
    code: false,
  },
  position: 'bottom-left',
  scale: 'medium',
  // Desligada por padrão: na referência o texto fica direto sobre a foto e a
  // sombra basta. Continua disponível para fotos muito claras.
  showBackdrop: false,
};

export type StoredPreferences = Partial<WatermarkPreferences> & {
  schemaVersion?: number;
};

/**
 * Reconstrói as preferências a partir do que estava salvo.
 *
 * Duas responsabilidades: completar campos que uma versão anterior do app não
 * conhecia — sem isso um `undefined` chegaria na renderização do carimbo — e
 * aplicar a migração de padrões quando o formato salvo é antigo.
 */
export function mergeWithDefaults(stored: StoredPreferences): WatermarkPreferences {
  const isLegacy = (stored.schemaVersion ?? 1) < PREFERENCES_SCHEMA_VERSION;

  const visibleFields = { ...DEFAULT_WATERMARK_PREFERENCES.visibleFields };
  for (const key of WATERMARK_FIELD_KEYS) {
    if (isLegacy && (RESET_ON_UPGRADE as readonly string[]).includes(key)) continue;

    const value = stored.visibleFields?.[key];
    if (typeof value === 'boolean') visibleFields[key] = value;
  }

  const showBackdrop =
    isLegacy || typeof stored.showBackdrop !== 'boolean'
      ? DEFAULT_WATERMARK_PREFERENCES.showBackdrop
      : stored.showBackdrop;

  return {
    visibleFields,
    position: stored.position ?? DEFAULT_WATERMARK_PREFERENCES.position,
    scale: stored.scale ?? DEFAULT_WATERMARK_PREFERENCES.scale,
    showBackdrop,
  };
}
