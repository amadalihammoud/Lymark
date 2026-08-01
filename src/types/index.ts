/**
 * Vocabulário de domínio do Lymark.
 *
 * Um único lugar define o que é um "campo de marca d'água", o que é um
 * "rascunho de captura" e o que é um "registro da galeria". Contextos,
 * telas e persistência falam todos esta mesma linguagem.
 */

/**
 * Campos que podem ser carimbados sobre a foto.
 *
 * A ordem desta tupla é a ordem em que as linhas aparecem na marca d'água
 * e nos formulários — mudar aqui muda nos dois lugares.
 */
export const WATERMARK_FIELD_KEYS = ['time', 'date', 'weekday', 'address', 'code'] as const;

export type WatermarkFieldKey = (typeof WATERMARK_FIELD_KEYS)[number];

/** Cantos onde o bloco de marca d'água pode ser ancorado. */
export const WATERMARK_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

/** Tamanho relativo do texto carimbado. */
export const WATERMARK_SCALES = ['small', 'medium', 'large'] as const;

export type WatermarkScale = (typeof WATERMARK_SCALES)[number];

/** Os dados textuais que acompanham uma foto. */
export type CaptureMetadata = Record<WatermarkFieldKey, string>;

/**
 * O trabalho em andamento na aba Capturar.
 *
 * Vive no `CaptureProvider`, acima das abas, para sobreviver à navegação —
 * é o que garante o critério de aceite "sem perder estado da captura".
 */
export type CaptureDraft = {
  /** URI local da foto escolhida, ou `null` enquanto nada foi selecionado. */
  photoUri: string | null;
  metadata: CaptureMetadata;
};

/** Preferências de como a marca d'água é desenhada. */
export type WatermarkPreferences = {
  /** Quais campos aparecem no carimbo. */
  visibleFields: Record<WatermarkFieldKey, boolean>;
  position: WatermarkPosition;
  scale: WatermarkScale;
  /** Faixa escura atrás do texto, para legibilidade sobre fotos claras. */
  showBackdrop: boolean;
};

/** Uma foto já exportada, guardada no histórico. */
export type GalleryEntry = {
  id: string;
  /** URI da imagem exportada, já com a marca d'água aplicada. */
  uri: string;
  /** ISO 8601 — momento da exportação. */
  exportedAt: string;
  /** Cópia dos metadados usados no carimbo, para exibir no detalhe. */
  metadata: CaptureMetadata;
};

/** Rótulos em português para cada campo, usados em formulários e listas. */
export const WATERMARK_FIELD_LABELS: Record<WatermarkFieldKey, string> = {
  time: 'Hora',
  date: 'Data',
  weekday: 'Dia da semana',
  address: 'Endereço / Local',
  code: 'Código de Foto',
};

export const WATERMARK_POSITION_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'Superior esquerdo',
  'top-right': 'Superior direito',
  'bottom-left': 'Inferior esquerdo',
  'bottom-right': 'Inferior direito',
};

export const WATERMARK_SCALE_LABELS: Record<WatermarkScale, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};
