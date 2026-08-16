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

export const STAMP_COLOR_LABELS: Record<StampColorKey, string> = {
  white: 'Branco',
  amber: 'Âmbar',
  red: 'Vermelho',
  green: 'Verde',
  blue: 'Azul',
  black: 'Preto',
};

/** Atalhos do seletor: o que se escolhe em um toque, antes de abrir a roda. */
export const STAMP_COLOR_SWATCHES: Record<StampColorKey, string> = {
  white: '#FFFFFF',
  amber: '#F3C218',
  red: '#FF6B57',
  green: '#5BD98A',
  blue: '#63B3ED',
  black: '#111820',
};

/**
 * Onde a marca aparece na foto.
 *
 * `header` é o cabeçalho acima do relógio — logo à esquerda, nome e
 * complemento à direita. `corner` é a linha compacta num canto, que não tem
 * espaço para logo nem para duas alturas de texto. São o mesmo dado em dois
 * formatos, e nunca os dois ao mesmo tempo: duas marcas na mesma foto
 * competem entre si.
 */
export const BRAND_PLACEMENTS = ['header', 'corner', 'none'] as const;

export type BrandPlacement = (typeof BRAND_PLACEMENTS)[number];

export const BRAND_PLACEMENT_LABELS: Record<BrandPlacement, string> = {
  header: 'Acima do relógio',
  corner: 'Num canto',
  none: 'Nenhuma',
};

/**
 * Como a faixa de fundo é desenhada — ou se é.
 *
 * `block` abraça o texto: um cartão com folga em volta, que é o que serve na
 * maioria das fotos. `band` atravessa a foto de borda a borda, encostada no
 * lado em que o carimbo está ancorado.
 *
 * A diferença não é decorativa. Sobre uma cena visualmente carregada — um
 * canteiro de obra, um pátio cheio, uma fachada com muita informação —, o
 * cartão flutuando parece adesivo colado por cima; a faixa contínua parece
 * parte do documento, porque tem a mesma largura da imagem que ela legenda.
 */
export const BACKDROP_STYLES = ['none', 'block', 'band'] as const;

export type BackdropStyle = (typeof BACKDROP_STYLES)[number];

export const BACKDROP_STYLE_LABELS: Record<BackdropStyle, string> = {
  none: 'Nenhuma',
  block: 'Atrás do texto',
  band: 'Faixa contínua',
};

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
  /** Cor livre, em hexadecimal. As chaves acima viram apenas atalhos na tela. */
  color: string;
};

export type WatermarkPreferences = {
  /** Quais campos aparecem no carimbo. */
  visibleFields: Record<WatermarkFieldKey, boolean>;
  position: WatermarkPosition;
  scale: WatermarkScale;
  /** Fundo escuro atrás do texto, para legibilidade sobre fotos claras. */
  backdropStyle: BackdropStyle;
  /** Canto onde a marca fica — independente do canto do bloco de dados. */
  brandPosition: WatermarkPosition;
  /** Marca do Lymark ou a da empresa de quem usa. */
  /** As duas partes da marca própria, cada uma com sua cor. */
  brandParts: [BrandPart, BrandPart];
  /** Onde a marca é desenhada — substitui o antigo liga/desliga. */
  brandPlacement: BrandPlacement;
  /**
   * Complemento do nome, na segunda linha do cabeçalho.
   *
   * Pode ser a continuação da razão social ou um slogan curto. Só aparece no
   * formato de cabeçalho; no canto não há altura para duas linhas.
   */
  brandComplement: string;
  /** Cor do complemento, livre. */
  brandComplementColor: string;
  /**
   * Arquivo do logotipo, copiado para dentro do app. `null` sem logotipo.
   *
   * Caminho **relativo** ao diretório de documentos, pela mesma razão que os
   * registros da galeria: no iOS o identificador do contêiner muda a cada
   * atualização e uma URI absoluta gravada hoje apontaria para o nada depois.
   */
  brandLogoPath: string | null;
  /**
   * Proporção largura/altura do logotipo, lida na hora de escolher o arquivo.
   *
   * Guardada junto porque a geometria é síncrona: descobrir a proporção no
   * momento do desenho exigiria decodificar a imagem dentro do cálculo de
   * layout, que roda a cada quadro do preview.
   */
  brandLogoAspect: number;

  /**
   * Cores do carimbo, independentes das cores da interface.
   *
   * Eram a mesma constante: mudar a barra do carimbo repintava os botões do
   * aplicativo. São perguntas diferentes — uma é identidade da foto, a outra
   * é identidade da tela.
   */
  stampAccent: string;
  stampTextColor: string;
  /** Cor da faixa, opacidade de 0 a 1, e arredondamento dos cantos. */
  backdropColor: string;
  backdropOpacity: number;
  /**
   * Raio dos cantos, em pontos.
   *
   * No cartão vale para os quatro. Na faixa contínua, só para os dois cantos
   * virados para dentro da foto: arredondar os que encostam na borda deixaria
   * aparecer um triângulo da imagem no canto, que lê como defeito.
   */
  backdropRadius: number;
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

export const CODE_PLACEMENT_LABELS: Record<CodePlacement, string> = {
  side: 'Lateral direita',
  block: 'Junto aos dados',
};

export const WATERMARK_SCALE_LABELS: Record<WatermarkScale, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};
