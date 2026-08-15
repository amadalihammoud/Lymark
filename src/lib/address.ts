import type { LocationGeocodedAddress } from 'expo-location';

import { conventionFor } from './address-conventions';

/**
 * Monta o endereço que vai no carimbo, na ordem do país onde a foto foi
 * tirada.
 *
 * No Brasil sai `Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002`. Na
 * França, `12 rue de Rivoli, 75001 Paris`. No Japão, `〒100-0001 東京都…`.
 *
 * A ordem importa porque o endereço é dado de comprovação: um endereço fora
 * da ordem local levanta dúvida sobre o documento inteiro.
 *
 * **A abreviação, no entanto, é só brasileira.** O reverse geocode devolve
 * tudo por extenso — "Avenida", "São Paulo" — e numa marca d'água isso rouba
 * espaço da foto. As abreviações abaixo são as de uso corrente no Brasil, e
 * não têm equivalente inventável para os outros países: chutar a abreviação
 * de um logradouro alemão e carimbá-la num laudo é pior do que não abreviar.
 * Fora do Brasil, o encurtamento acontece jogando componente fora — ver
 * `trimToFit`.
 *
 * Campos faltando são comuns (zona rural, endereço novo, GPS impreciso), e
 * cada trecho só entra se existir: nada de vírgula solta ou traço órfão.
 */

/** Tipos de logradouro, do mais longo para o mais curto na comparação. */
const STREET_TYPES: [RegExp, string][] = [
  [/^avenida\b/i, 'Av.'],
  [/^alameda\b/i, 'Al.'],
  [/^estrada\b/i, 'Estr.'],
  [/^rodovia\b/i, 'Rod.'],
  [/^travessa\b/i, 'Tv.'],
  [/^praça\b/i, 'Pç.'],
  [/^praca\b/i, 'Pç.'],
  [/^largo\b/i, 'Lgo.'],
  [/^viela\b/i, 'Vl.'],
  [/^rua\b/i, 'R.'],
];

/** Unidades federativas por extenso — o geocode raramente devolve a sigla. */
const STATE_ABBREVIATIONS: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

/** `Avenida Puglisi` → `Av. Puglisi`. Desconhecido passa intacto. */
export function abbreviateStreet(street: string): string {
  for (const [pattern, abbreviation] of STREET_TYPES) {
    if (pattern.test(street)) {
      return street.replace(pattern, abbreviation);
    }
  }
  return street;
}

/** `São Paulo` → `SP`. Já abreviado ou desconhecido passa intacto. */
export function abbreviateState(region: string): string {
  const normalized = region.trim().toLowerCase();
  return STATE_ABBREVIATIONS[normalized] ?? region.trim();
}

/**
 * Quantos caracteres cabem em duas linhas do carimbo, com folga.
 *
 * Não é largura exata — o carimbo se redimensiona — mas é o ponto a partir do
 * qual o endereço começa a competir com a foto. Passando daqui, componentes
 * saem.
 */
const COMFORTABLE_LENGTH = 62;

const clean = (value: string | null | undefined) => value?.trim() || '';

/** Junta o que existe, sem separador solto quando um pedaço falta. */
const join = (parts: (string | undefined)[], separator: string) =>
  parts.filter((part) => part && part.length > 0).join(separator);

export type AddressOptions = {
  /**
   * Acrescenta o país ao fim do endereço.
   *
   * Desligado por padrão porque, na esmagadora maioria dos casos, quem
   * registra e quem recebe a foto estão no mesmo país — e aí o país só rouba
   * espaço da imagem. Existe para quem presta serviço além da fronteira.
   */
  includeCountry?: boolean;
};

export function formatGeocodedAddress(
  address: LocationGeocodedAddress,
  options: AddressOptions = {},
): string {
  const country = clean(address.isoCountryCode).toUpperCase();

  /*
   * País desconhecido segue pelo caminho brasileiro, e isso é seguro por uma
   * razão específica: as duas tabelas de abreviação são inertes fora do
   * Brasil. `abbreviateStreet` só reage a "Avenida", "Rua" e afins;
   * `abbreviateState` só conhece as 27 unidades federativas. Uma
   * "Hauptstraße" atravessa as duas sem ser tocada.
   *
   * Então, quando o geocodificador não informa o país — acontece em Android
   * antigo e em resultado parcial —, o pior caso é uma ordenação brasileira
   * num endereço estrangeiro, que continua legível. A alternativa seria
   * perder a abreviação no mercado onde o aplicativo de fato roda hoje.
   */
  const line =
    country === '' || country === 'BR'
      ? formatBrazilian(address)
      : formatInternational(address);

  if (!options.includeCountry) return line;

  const name = clean(address.country);

  // Não repete o país quando ele já veio no endereço que o sistema formatou.
  return name && !line.endsWith(name) ? join([line, name], ', ') : line;
}

/** O formato brasileiro, com as abreviações que só valem aqui. */
function formatBrazilian(address: LocationGeocodedAddress): string {
  const street = address.street ? abbreviateStreet(clean(address.street)) : '';
  const withNumber = join([street, clean(address.streetNumber)], ', ');

  // O bairro entra depois de um traço, e não de vírgula: é o que separa o
  // logradouro da localidade no padrão brasileiro.
  const streetPart = join([withNumber, clean(address.district)], ' - ');

  const city = clean(address.city) || clean(address.subregion);
  const state = address.region ? abbreviateState(address.region) : '';
  const cityPart = join([city, state], ' - ');

  return join([streetPart, cityPart, clean(address.postalCode)], ', ');
}

/**
 * O formato de qualquer outro país.
 *
 * Monta na ordem local a partir dos componentes; se o resultado ficar vazio —
 * geocodificador devolveu pouco — cai no endereço que o próprio sistema
 * operacional já formatou, que é a melhor fonte que existe para um país cuja
 * convenção não conhecemos.
 */
function formatInternational(address: LocationGeocodedAddress): string {
  const convention = conventionFor(address.isoCountryCode);

  const street = clean(address.street);
  const number = clean(address.streetNumber);
  const streetLine = convention.numberFirst
    ? join([number, street], ' ')
    : join([street, number], ' ');

  const city = clean(address.city) || clean(address.subregion);
  const region = clean(address.region);
  const postal = clean(address.postalCode);
  const district = clean(address.district);

  const cityBlock =
    convention.postal === 'before-city'
      ? join([postal, city], ' ')
      : convention.postal === 'after-region'
        ? join([join([city, region], ', '), postal], ' ')
        : join([city, region], ', ');

  const pieces = convention.majorToMinor
    ? [region, city, district, streetLine]
    : [streetLine, district, cityBlock];

  // Nas convenções maior-para-menor a cidade já entrou acima, sem o postal;
  // ele volta na ponta que a convenção pedir.
  const assembled = join(pieces, ', ');

  const withPostal =
    convention.postal === 'first'
      ? join([postal, assembled], ' ')
      : convention.postal === 'last' || convention.majorToMinor
        ? join([assembled, postal], ', ')
        : assembled;

  // Sem componentes suficientes, o endereço que o Android já montou vale mais
  // que um resto de linha nosso.
  return withPostal || clean(address.formattedAddress);
}

/**
 * Encurta um endereço longo removendo componentes, nunca reescrevendo
 * palavras.
 *
 * A ordem de descarte vai do menos ao mais informativo para quem lê a foto:
 * o código postal primeiro — é redundante quando há cidade — depois o país, e
 * por último o bairro. Logradouro e cidade nunca saem: sem eles o carimbo
 * deixa de responder "onde".
 *
 * Reescrever palavra num idioma que não conhecemos produziria abreviação
 * errada num documento de comprovação. Remover um componente inteiro é
 * honesto: o que fica continua verdadeiro.
 */
export function trimToFit(value: string, limit = COMFORTABLE_LENGTH): string {
  if (value.length <= limit) return value;

  const parts = value.split(', ');

  // Tira do fim para o começo, preservando os dois primeiros trechos, que
  // carregam logradouro e localidade.
  while (parts.length > 2 && parts.join(', ').length > limit) {
    parts.pop();
  }

  return parts.join(', ');
}
