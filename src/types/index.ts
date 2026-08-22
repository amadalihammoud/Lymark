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

/**
 * Onde o logotipo da empresa é desenhado.
 *
 * `block` é o comportamento de sempre: dentro do cabeçalho da marca, junto
 * ao carimbo. Os quatro cantos soltam o logotipo do bloco — um logo grande
 * pode ir para o alto enquanto os dados ficam embaixo.
 */
export const BRAND_LOGO_POSITIONS = ['block', ...WATERMARK_POSITIONS] as const;

export type BrandLogoPosition = (typeof BRAND_LOGO_POSITIONS)[number];

/** Onde o Código de Foto é carimbado. */
export const CODE_PLACEMENTS = ['side', 'block'] as const;

export type CodePlacement = (typeof CODE_PLACEMENTS)[number];

/** Tamanho relativo do texto carimbado. */
export const WATERMARK_SCALES = ['small', 'medium', 'large'] as const;

export type WatermarkScale = (typeof WATERMARK_SCALES)[number];

/**
 * Como a hora é PREENCHIDA nos campos do carimbo.
 *
 * É preferência, e não deteção do aparelho, de propósito: o formato da hora
 * é parte do documento e não pode mudar sozinho porque o celular trocou de
 * configuração — a mesma razão de o carimbo não usar `Intl`. O campo segue
 * texto livre: isto decide só o que o app escreve por conta própria.
 */
export const TIME_FORMATS = ['24h', '12h'] as const;

export type TimeFormat = (typeof TIME_FORMATS)[number];

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

/** Atalhos do seletor: o que se escolhe em um toque, antes de abrir a roda. */
export const STAMP_COLOR_SWATCHES: Record<StampColorKey, string> = {
  white: '#FFFFFF',
  amber: '#F3C218',
  red: '#FF6B57',
  green: '#5BD98A',
  blue: '#63B3ED',
  black: '#111820',
};

/*
 * Os rótulos destes conjuntos — campos, posições, tamanhos, cores, formatos
 * de marca e de faixa — ficavam aqui como constantes de módulo, em português.
 * Foram para `i18n/messages/`, sob `app.watermark.*`, com as MESMAS chaves
 * usadas nestes arrays: `t(`watermark.positions.${position}`)`.
 *
 * O motivo é o mesmo das mensagens de GPS: uma constante de módulo é avaliada
 * uma vez, na carga do arquivo, e ficaria presa ao idioma daquele instante.
 */
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
  /** Formato em que a hora é preenchida — 24h ou 12h (AM/PM). */
  timeFormat: TimeFormat;
  /** Fundo escuro atrás do texto, para legibilidade sobre fotos claras. */
  backdropStyle: BackdropStyle;
  /**
   * Se o país entra no endereço carimbado.
   *
   * Desligado por padrão: na esmagadora maioria dos casos quem registra e
   * quem recebe estão no mesmo país, e o país só rouba espaço da foto. Fica
   * disponível para quem presta serviço além da fronteira, onde a omissão
   * tornaria o endereço ambíguo.
   */
  includeCountry: boolean;
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
   * Canto próprio do logotipo, independente do bloco de dados.
   *
   * `block` mantém o logo dentro do cabeçalho da marca, como sempre foi. Um
   * canto o solta do bloco: ele é desenhado ali sozinho, no tamanho da linha
   * da hora vezes a escala — e vale para QUALQUER formato de marca, inclusive
   * quando o cabeçalho está desligado.
   */
  brandLogoPosition: BrandLogoPosition;
  /**
   * Escala manual do logotipo, de 0,5 a 2,5 (1 é o tamanho automático).
   *
   * Multiplica largura e altura JUNTAS: um controle separado por eixo
   * deformaria o logotipo da empresa na foto que ela entrega ao cliente.
   * Vale nos dois formatos — ao lado do texto e na faixa da assinatura
   * horizontal.
   */
  brandLogoScale: number;
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

