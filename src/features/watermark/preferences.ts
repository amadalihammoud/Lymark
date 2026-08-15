import {
  BRAND_MODES,
  CODE_PLACEMENTS,
  STAMP_COLOR_KEYS,
  WATERMARK_FIELD_KEYS,
  WATERMARK_POSITIONS,
  WATERMARK_SCALES,
  type BrandPart,
  type WatermarkPreferences,
} from '@/types';

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
 * 1 — carimbo em cinco linhas iguais, faixa escura ligada, código no bloco.
 * 2 — layout de referência; desliguei o código por engano, achando que a
 *     referência não o carimbava. Ela carimba: girado, na lateral direita.
 * 3 — código de volta, com posição configurável, e marca do app na foto.
 */
export const PREFERENCES_SCHEMA_VERSION = 4;

/**
 * Campos cujo padrão mudou e que por isso são remigrados.
 *
 * `code` aparece aqui porque a versão 2 o desligou por um erro de leitura
 * meu, não por escolha de ninguém — quem atualizou não deve herdar isso.
 */
const RESET_ON_UPGRADE = ['showBackdrop', 'code'] as const;

/**
 * Até qual versão a remigração acima vale.
 *
 * Sem este limite, a lista seria reaplicada a **cada** nova versão do esquema:
 * subir para a 4 para acrescentar a marca própria desligaria a faixa escura de
 * quem a tinha ligado de propósito, e o mesmo aconteceria na 5, na 6, sempre.
 * A correção pertence à transição em que foi feita, e não ao futuro inteiro.
 */
const RESET_BEFORE_VERSION = 3;

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
  // Desligada por padrão: na referência o texto fica direto sobre a foto e a
  // sombra basta. Continua disponível para fotos muito claras.
  showBackdrop: false,
  includeCountry: false,
  showBrand: true,
  brandPosition: 'top-right',
  brandMode: 'lymark',
  // O padrão reproduz a marca do app: uma palavra, duas cores. Serve também
  // de exemplo do que a marca própria pode fazer.
  brandParts: [
    { text: 'Ly', color: 'white' },
    { text: 'mark', color: 'amber' },
  ],
  codePlacement: 'side',
};

/** Limite de caracteres por parte. Nome maior que isso não cabe na foto. */
export const BRAND_PART_MAX_LENGTH = 24;

/**
 * Lê uma parte da marca do que estava gravado.
 *
 * Texto de tipo errado vira string vazia em vez de derrubar a tela, e a cor
 * cai no padrão quando não é uma das da paleta.
 */
function readBrandPart(value: unknown, fallback: BrandPart): BrandPart {
  if (typeof value !== 'object' || value === null) return { ...fallback };

  const part = value as Partial<BrandPart>;

  return {
    text: typeof part.text === 'string' ? part.text.slice(0, BRAND_PART_MAX_LENGTH) : '',
    color: pickAllowed(part.color, STAMP_COLOR_KEYS, fallback.color),
  };
}

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
  // `JSON.parse('null')` é `null`, e uma gravação interrompida deixa
  // exatamente isso na chave. Ler `.schemaVersion` daí lança dentro da
  // hidratação e trava a persistência das preferências de forma permanente:
  // o usuário muda um ajuste, ele volta sozinho no próximo boot, sem erro.
  if (typeof stored !== 'object' || stored === null) {
    return mergeWithDefaults({});
  }

  const isLegacy = (stored.schemaVersion ?? 1) < RESET_BEFORE_VERSION;

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
    includeCountry:
      typeof stored.includeCountry === 'boolean'
        ? stored.includeCountry
        : DEFAULT_WATERMARK_PREFERENCES.includeCountry,
    position: pickAllowed(
      stored.position,
      WATERMARK_POSITIONS,
      DEFAULT_WATERMARK_PREFERENCES.position,
    ),
    scale: pickAllowed(stored.scale, WATERMARK_SCALES, DEFAULT_WATERMARK_PREFERENCES.scale),
    showBackdrop,
    showBrand:
      typeof stored.showBrand === 'boolean'
        ? stored.showBrand
        : DEFAULT_WATERMARK_PREFERENCES.showBrand,
    brandPosition: pickAllowed(
      stored.brandPosition,
      WATERMARK_POSITIONS,
      DEFAULT_WATERMARK_PREFERENCES.brandPosition,
    ),
    brandMode: pickAllowed(
      stored.brandMode,
      BRAND_MODES,
      DEFAULT_WATERMARK_PREFERENCES.brandMode,
    ),
    brandParts: [
      readBrandPart(stored.brandParts?.[0], DEFAULT_WATERMARK_PREFERENCES.brandParts[0]),
      readBrandPart(stored.brandParts?.[1], DEFAULT_WATERMARK_PREFERENCES.brandParts[1]),
    ],
    codePlacement: pickAllowed(
      stored.codePlacement,
      CODE_PLACEMENTS,
      DEFAULT_WATERMARK_PREFERENCES.codePlacement,
    ),
  };
}

/**
 * Aceita um valor gravado apenas se ele pertence ao conjunto conhecido.
 *
 * `StoredPreferences` é uma asserção sobre um `JSON.parse`, não uma garantia
 * de runtime: um build de teste pode ter gravado `scale: 'xlarge'`, e o
 * registro pode simplesmente estar corrompido. Sem esta checagem,
 * `SCALE_METRICS[scale]` devolveria `undefined` e a tela quebraria — e como
 * o valor ruim seria regravado, quebraria em toda abertura seguinte, sem
 * conserto possível a não ser reinstalar o app.
 */
function pickAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
