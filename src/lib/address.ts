import type { LocationGeocodedAddress } from 'expo-location';

/**
 * Monta o endereço no formato do carimbo:
 * `Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002`
 *
 * O reverse geocode devolve tudo por extenso — "Avenida", "São Paulo" — e
 * numa marca d'água isso rouba espaço da foto e empurra o texto para duas
 * linhas. As abreviações são as de uso corrente em endereço no Brasil.
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

export function formatGeocodedAddress(address: LocationGeocodedAddress): string {
  const street = address.street ? abbreviateStreet(address.street.trim()) : '';
  const withNumber = [street, address.streetNumber?.trim()].filter(Boolean).join(', ');

  // O bairro entra depois de um traço, e não de vírgula: é o que separa o
  // logradouro da localidade no padrão brasileiro.
  const district = address.district?.trim();
  const streetPart = [withNumber, district].filter(Boolean).join(' - ');

  const city = (address.city ?? address.subregion)?.trim();
  const state = address.region ? abbreviateState(address.region) : '';
  const cityPart = [city, state].filter(Boolean).join(' - ');

  return [streetPart, cityPart, address.postalCode?.trim()].filter(Boolean).join(', ');
}
