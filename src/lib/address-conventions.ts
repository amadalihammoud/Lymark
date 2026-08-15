/**
 * Como cada país escreve um endereço.
 *
 * O Lymark carimba endereço em qualquer lugar do mundo, e a tentação seria
 * escrever uma tabela de abreviações por país. Isso não escala e, pior,
 * produz erro: são quase duzentos sistemas de endereçamento, e chutar a
 * abreviação de um logradouro alemão para carimbá-la num documento de
 * vistoria é pior do que não abreviar.
 *
 * A regra deste módulo é outra:
 *
 * **Onde a convenção é conhecida, montamos na ordem local. Onde não é,
 * usamos o que o sistema operacional já formatou.** O geocodificador do
 * Android devolve `formattedAddress` na convenção do país — ninguém tem
 * tabela melhor que a do próprio sistema. E quando nada disso serve, o
 * endereço encurta jogando componente fora, nunca reescrevendo palavra:
 * o que sobra continua correto porque nunca foi inventado.
 *
 * O que está descrito aqui é só a **ordem** — a parte que muda a leitura.
 * Abreviação de logradouro continua existindo apenas para o Brasil, em
 * `address.ts`, onde as regras são conhecidas e verificadas.
 */

/** Onde o código postal entra na linha. */
export type PostalPlacement =
  /** `10115 Berlin` — antes da cidade. Boa parte da Europa continental. */
  | 'before-city'
  /** `New York, NY 10001` — depois da região. Estados Unidos, Canadá, Austrália. */
  | 'after-region'
  /** `London SW1A 1AA` — no fim da linha. Reino Unido, Brasil, Índia. */
  | 'last'
  /** `〒100-0001 東京都…` — abre o endereço. Japão. */
  | 'first';

export type AddressConvention = {
  /** `12 rue de Rivoli` em vez de `Rua de Rivoli, 12`. */
  numberFirst: boolean;
  postal: PostalPlacement;
  /**
   * Do maior para o menor: país, província, cidade, rua.
   *
   * É como Japão, China e Coreia escrevem, e inverter para caber num molde
   * ocidental produz um endereço que ninguém daqueles países escreveria.
   */
  majorToMinor: boolean;
};

/**
 * A convenção usada quando o país não está na tabela.
 *
 * Número depois do logradouro e código postal no fim cobrem a maior parte do
 * mundo — e, mais importante, ficam legíveis mesmo onde não são o costume:
 * um endereço em ordem incomum ainda se lê; um endereço com a palavra errada,
 * não.
 */
export const DEFAULT_CONVENTION: AddressConvention = {
  numberFirst: false,
  postal: 'last',
  majorToMinor: false,
};

/**
 * Países onde o número vem antes do logradouro.
 *
 * A França está aqui, e costuma surpreender: escreve-se `12 rue de Rivoli`,
 * ao contrário da vizinhança continental.
 */
const NUMBER_BEFORE_STREET = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'IN', 'ZA', 'FR', 'MY', 'SG', 'HK',
  'PH', 'TH', 'ID', 'NG', 'KE', 'PK', 'BD', 'LK', 'IL', 'AE',
] as const;

/** Países que escrevem do maior para o menor. */
const MAJOR_TO_MINOR = ['JP', 'CN', 'KR', 'TW', 'MO', 'HU'] as const;

/** Código postal antes da cidade — Europa continental, na maior parte. */
const POSTAL_BEFORE_CITY = [
  'DE', 'AT', 'CH', 'FR', 'NL', 'BE', 'LU', 'DK', 'SE', 'NO', 'FI', 'IS',
  'PL', 'CZ', 'SK', 'RO', 'BG', 'HR', 'SI', 'RS', 'GR', 'TR', 'RU', 'UA',
  'IT', 'ES', 'PT',
] as const;

/** Código postal depois da região. */
const POSTAL_AFTER_REGION = ['US', 'CA', 'AU', 'NZ', 'MX', 'AR'] as const;

/** Código postal abrindo a linha. */
const POSTAL_FIRST = ['JP'] as const;

/**
 * A convenção de um país, pelo código ISO de duas letras.
 *
 * Um país ausente da tabela não é um erro: recebe `DEFAULT_CONVENTION`, e o
 * endereço sai legível. A tabela cresce quando um mercado aparecer de verdade
 * e alguém puder confirmar a convenção — nunca por palpite.
 */
export function conventionFor(isoCountryCode: string | null | undefined): AddressConvention {
  if (!isoCountryCode) return DEFAULT_CONVENTION;

  const code = isoCountryCode.trim().toUpperCase();
  if (code.length !== 2) return DEFAULT_CONVENTION;

  return {
    numberFirst: (NUMBER_BEFORE_STREET as readonly string[]).includes(code),
    majorToMinor: (MAJOR_TO_MINOR as readonly string[]).includes(code),
    postal: (POSTAL_FIRST as readonly string[]).includes(code)
      ? 'first'
      : (POSTAL_BEFORE_CITY as readonly string[]).includes(code)
        ? 'before-city'
        : (POSTAL_AFTER_REGION as readonly string[]).includes(code)
          ? 'after-region'
          : 'last',
  };
}
