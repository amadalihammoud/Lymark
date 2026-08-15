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

/** Onde o Código de Foto é carimbado. */
export const CODE_PLACEMENTS = ['side', 'block'] as const;

export type CodePlacement = (typeof CODE_PLACEMENTS)[number];

/** Tamanho relativo do texto carimbado. */
export const WATERMARK_SCALES = ['small', 'medium', 'large'] as const;

export type WatermarkScale = (typeof WATERMARK_SCALES)[number];

/** Os dados textuais que acompanham uma foto. */
export type CaptureMetadata = Record<WatermarkFieldKey, string>;

/**
 * A foto escolhida, com as dimensões originais.
 *
 * As dimensões não são decoração: definem a proporção do preview e a
 * resolução da imagem exportada.
 */
export type SelectedPhoto = {
  uri: string;
  width: number;
  height: number;
};

/**
 * O trabalho em andamento na aba Capturar.
 *
 * Vive no `CaptureProvider`, acima das abas, para sobreviver à navegação —
 * é o que garante o critério de aceite "sem perder estado da captura".
 */
export type CaptureDraft = {
  /** A foto escolhida, ou `null` enquanto nada foi selecionado. */
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
};

/** Preferências de como a marca d'água é desenhada. */
/**
 * Cores disponíveis para as partes da marca.
 *
 * Paleta fechada, e não seletor livre, por uma razão de campo: sobre asfalto
 * ou parede clara, metade do espectro simplesmente some. Estas seis foram
 * escolhidas para funcionar com a sombra que o carimbo já aplica, em foto
 * clara e em foto escura.
 */
export const STAMP_COLOR_KEYS = ['white', 'amber', 'red', 'green', 'blue', 'black'] as const;

export type StampColorKey = (typeof STAMP_COLOR_KEYS)[number];

/**
 * De onde vem a marca carimbada na foto.
 *
 * `logo` ainda não existe; a estrutura já prevê o lugar dele para que a
 * migração das preferências não precise acontecer duas vezes.
 */
/*
 * Os rótulos destes conjuntos — campos, posições, tamanhos, cores e modos de
 * marca — ficavam aqui como constantes de módulo, em português. Foram para
 * `i18n/messages/`, sob `app.watermark.*`, com as MESMAS chaves usadas nestes
 * arrays: `t(`watermark.positions.${position}`)`.
 *
 * O motivo é o mesmo das mensagens de GPS: uma constante de módulo é avaliada
 * uma vez, na carga do arquivo, e ficaria presa ao idioma daquele instante.
 */

export const BRAND_MODES = ['lymark', 'custom'] as const;

export type BrandMode = (typeof BRAND_MODES)[number];

/**
 * Um trecho da marca, com cor própria.
 *
 * São **partes**, e não palavras: "Lymark" é uma palavra só em duas cores, e
 * o mesmo vale para "AutoGlass" ou "TecnoSul". Dividir por espaço não daria
 * conta nem da nossa própria marca. As duas partes são desenhadas coladas —
 * quem quiser espaço entre elas, digita o espaço.
 */
export type BrandPart = {
  text: string;
  color: StampColorKey;
};

export type WatermarkPreferences = {
  /** Quais campos aparecem no carimbo. */
  visibleFields: Record<WatermarkFieldKey, boolean>;
  position: WatermarkPosition;
  scale: WatermarkScale;
  /** Faixa escura atrás do texto, para legibilidade sobre fotos claras. */
  showBackdrop: boolean;
  /** Carimba a marca do Lymark na foto. */
  showBrand: boolean;
  /** Canto onde a marca fica — independente do canto do bloco de dados. */
  brandPosition: WatermarkPosition;
  /** Marca do Lymark ou a da empresa de quem usa. */
  brandMode: BrandMode;
  /** As duas partes da marca própria, cada uma com sua cor. */
  brandParts: [BrandPart, BrandPart];
  /**
   * O código na lateral fica girado, colado na borda direita: não compete
   * com o conteúdo da foto. No bloco, acompanha hora, data e endereço.
   */
  codePlacement: CodePlacement;
};

/** Uma foto já exportada, guardada no histórico. */
export type GalleryEntry = {
  id: string;
  /**
   * Caminho **relativo** ao diretório de documentos (`exports/<arquivo>.jpg`).
   *
   * Relativo e não absoluto de propósito: no iOS o identificador do contêiner
   * do app muda a cada atualização, e uma URI absoluta gravada hoje apontaria
   * para o nada depois dela.
   */
  path: string;
  /** ISO 8601 — momento da exportação. */
  exportedAt: string;
  /** Cópia dos metadados usados no carimbo, para exibir no detalhe. */
  metadata: CaptureMetadata;
  /**
   * Quais campos foram de fato carimbados nesta foto.
   *
   * Guardado junto porque as preferências mudam com o tempo: sem isto, o
   * detalhe de uma foto antiga listaria campos que nunca chegaram à imagem,
   * afirmando algo falso sobre um registro fotográfico.
   */
  stampedFields: WatermarkFieldKey[];
};

/** Rótulos em português para cada campo, usados em formulários e listas. */
