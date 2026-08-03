import {
  BACKDROP_STYLES,
  BRAND_MODES,
  BRAND_PLACEMENTS,
  CODE_PLACEMENTS,
  STAMP_COLOR_SWATCHES,
  WATERMARK_FIELD_KEYS,
  WATERMARK_POSITIONS,
  WATERMARK_SCALES,
  type BrandPart,
  type StampColorKey,
  type WatermarkPreferences,
} from '@/types';

import { isManagedLogoPath } from './logo-path';

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
 * 4 — marca própria em duas partes, cada uma com cor da paleta fechada.
 * 5 — cores livres em hexadecimal, cabeçalho de marca com logotipo e
 *     complemento, e a faixa de fundo com cor, opacidade e arredondamento
 *     próprios. Os dois liga/desliga viram listas: `brandPlacement` e
 *     `backdropStyle`, este último com a faixa contínua como terceira opção.
 */
export const PREFERENCES_SCHEMA_VERSION = 5;

/**
 * Campos cujo padrão mudou e que por isso são remigrados.
 *
 * `code` aparece aqui porque a versão 2 o desligou por um erro de leitura
 * meu, não por escolha de ninguém — quem atualizou não deve herdar isso.
 */
const RESET_ON_UPGRADE = ['showBackdrop', 'code'] as const;

/** Os campos de `visibleFields` remigrados. `showBackdrop` não é um deles. */
const RESET_VISIBLE_FIELDS = RESET_ON_UPGRADE as readonly string[];

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
  backdropStyle: 'none',
  brandPosition: 'top-right',
  brandMode: 'lymark',
  // O padrão reproduz a marca do app: uma palavra, duas cores. Serve também
  // de exemplo do que a marca própria pode fazer.
  brandParts: [
    { text: 'Ly', color: '#FFFFFF' },
    { text: 'mark', color: '#F5B60D' },
  ],
  // Canto, como sempre foi. Quem quiser o cabeçalho com logo escolhe.
  brandPlacement: 'corner',
  brandComplement: '',
  brandComplementColor: '#FFFFFF',
  brandLogoPath: null,
  brandLogoAspect: 1,

  stampAccent: '#F5B60D',
  stampTextColor: '#FFFFFF',
  backdropColor: '#000000',
  backdropOpacity: 0.75,
  backdropRadius: 4,
  codePlacement: 'side',
};

/** Cor em hexadecimal de seis dígitos — o formato que o seletor produz. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function readColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toUpperCase() : fallback;
}

/** Número dentro de um intervalo. Fora dele, ou não sendo número, cai no padrão. */
function readNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Limite de caracteres por parte. Nome maior que isso não cabe na foto. */
export const BRAND_PART_MAX_LENGTH = 24;

/**
 * Limite do complemento — maior que o do nome, e de propósito.
 *
 * O nome é a palavra grande, que domina a assinatura; o complemento é a linha
 * de apoio, em corpo menor, e costuma ser uma frase: "Vistorias e laudos
 * técnicos" não cabe em 24 caracteres.
 */
export const BRAND_COMPLEMENT_MAX_LENGTH = 40;

/** Só um caminho gerido pelo app é aceito — ver `logo-path.ts`. */
function readLogoPath(value: unknown): string | null {
  return isManagedLogoPath(value) ? value : null;
}

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
    // Migração silenciosa: a versão 4 gravava o nome da cor, e não o valor.
    color: readColor(STAMP_COLOR_SWATCHES[part.color as StampColorKey] ?? part.color, fallback.color),
  };
}

export type StoredPreferences = Partial<WatermarkPreferences> & {
  schemaVersion?: number;
  /**
   * Liga/desliga da marca, das versões até a 4.
   *
   * Não faz mais parte das preferências — `brandPlacement` responde a mesma
   * pergunta com três respostas em vez de duas. Continua declarado aqui porque
   * ainda está gravado no aparelho de quem atualiza, e é dele que sai a
   * migração.
   */
  showBrand?: boolean;
  /** Liga/desliga da faixa, das versões até a 4. Ver `backdropStyle`. */
  showBackdrop?: boolean;
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
    if (isLegacy && RESET_VISIBLE_FIELDS.includes(key)) continue;

    const value = stored.visibleFields?.[key];
    if (typeof value === 'boolean') visibleFields[key] = value;
  }

  // Até a versão 4 a faixa era um liga/desliga. Ligada vira o cartão, que é
  // exatamente o que ela desenhava — a atualização não pode mudar a aparência
  // da foto de ninguém. A faixa contínua é escolha nova, nunca herdada.
  const backdropStyle = pickAllowed(
    stored.backdropStyle,
    BACKDROP_STYLES,
    isLegacy || typeof stored.showBackdrop !== 'boolean'
      ? DEFAULT_WATERMARK_PREFERENCES.backdropStyle
      : stored.showBackdrop
        ? 'block'
        : 'none',
  );

  return {
    visibleFields,
    position: pickAllowed(
      stored.position,
      WATERMARK_POSITIONS,
      DEFAULT_WATERMARK_PREFERENCES.position,
    ),
    scale: pickAllowed(stored.scale, WATERMARK_SCALES, DEFAULT_WATERMARK_PREFERENCES.scale),
    backdropStyle,
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
    // Quem vinha das versões anteriores tinha um liga/desliga. Desligado vira
    // "nenhuma"; ligado vira "num canto", que é onde a marca já estava — a
    // atualização não pode mudar a aparência da foto de ninguém.
    brandPlacement: pickAllowed(
      stored.brandPlacement,
      BRAND_PLACEMENTS,
      stored.showBrand === false ? 'none' : DEFAULT_WATERMARK_PREFERENCES.brandPlacement,
    ),
    brandComplement:
      typeof stored.brandComplement === 'string'
        ? stored.brandComplement.slice(0, BRAND_COMPLEMENT_MAX_LENGTH)
        : DEFAULT_WATERMARK_PREFERENCES.brandComplement,
    brandComplementColor: readColor(
      stored.brandComplementColor,
      DEFAULT_WATERMARK_PREFERENCES.brandComplementColor,
    ),
    // Só um caminho relativo dentro do diretório gerido é aceito. Um valor
    // absoluto ou com `..` gravado por um build antigo — ou por corrupção —
    // faria o app ler um arquivo qualquer do sistema e carimbá-lo na foto.
    brandLogoPath: readLogoPath(stored.brandLogoPath),
    // Proporções extremas viram um filete ou uma faixa que atravessa a foto.
    brandLogoAspect: readNumber(
      stored.brandLogoAspect,
      0.2,
      5,
      DEFAULT_WATERMARK_PREFERENCES.brandLogoAspect,
    ),

    stampAccent: readColor(stored.stampAccent, DEFAULT_WATERMARK_PREFERENCES.stampAccent),
    stampTextColor: readColor(
      stored.stampTextColor,
      DEFAULT_WATERMARK_PREFERENCES.stampTextColor,
    ),
    backdropColor: readColor(
      stored.backdropColor,
      DEFAULT_WATERMARK_PREFERENCES.backdropColor,
    ),
    backdropOpacity: readNumber(
      stored.backdropOpacity,
      0,
      1,
      DEFAULT_WATERMARK_PREFERENCES.backdropOpacity,
    ),
    backdropRadius: readNumber(
      stored.backdropRadius,
      0,
      24,
      DEFAULT_WATERMARK_PREFERENCES.backdropRadius,
    ),
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
