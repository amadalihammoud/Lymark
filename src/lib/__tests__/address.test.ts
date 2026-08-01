import type { LocationGeocodedAddress } from 'expo-location';

import { abbreviateState, abbreviateStreet, formatGeocodedAddress } from '../address';

/**
 * O reverse geocode devolve tudo por extenso e com campos faltando. O
 * formato precisa abreviar como se escreve endereço no Brasil e degradar
 * sem deixar vírgula solta ou traço órfão sobre a foto.
 */
function makeAddress(overrides: Partial<LocationGeocodedAddress>): LocationGeocodedAddress {
  return {
    city: null,
    district: null,
    streetNumber: null,
    street: null,
    region: null,
    subregion: null,
    country: null,
    postalCode: null,
    name: null,
    isoCountryCode: null,
    timezone: null,
    formattedAddress: null,
    ...overrides,
  } as LocationGeocodedAddress;
}

describe('abbreviateStreet', () => {
  it('abrevia os tipos de logradouro mais comuns', () => {
    expect(abbreviateStreet('Avenida Puglisi')).toBe('Av. Puglisi');
    expect(abbreviateStreet('Rua Azuíl Loureiro')).toBe('R. Azuíl Loureiro');
    expect(abbreviateStreet('Praça da Sé')).toBe('Pç. da Sé');
    expect(abbreviateStreet('Rodovia Anchieta')).toBe('Rod. Anchieta');
    expect(abbreviateStreet('Travessa do Ouvidor')).toBe('Tv. do Ouvidor');
  });

  it('não mexe em logradouro desconhecido', () => {
    expect(abbreviateStreet('Beco do Batman')).toBe('Beco do Batman');
  });

  it('não abrevia no meio do nome — só o tipo, que vem na frente', () => {
    expect(abbreviateStreet('Rua Rua Velha')).toBe('R. Rua Velha');
    expect(abbreviateStreet('Estrada da Praia Grande')).toBe('Estr. da Praia Grande');
  });
});

describe('abbreviateState', () => {
  it('converte o nome do estado para a sigla', () => {
    expect(abbreviateState('São Paulo')).toBe('SP');
    expect(abbreviateState('Rio de Janeiro')).toBe('RJ');
    expect(abbreviateState('Minas Gerais')).toBe('MG');
    expect(abbreviateState('Distrito Federal')).toBe('DF');
  });

  it('é indiferente a maiúsculas e espaços', () => {
    expect(abbreviateState('  são paulo ')).toBe('SP');
  });

  it('deixa passar o que já vem abreviado ou não reconhece', () => {
    expect(abbreviateState('SP')).toBe('SP');
    expect(abbreviateState('Lisboa')).toBe('Lisboa');
  });
});

describe('formatGeocodedAddress', () => {
  it('monta o endereço no formato do carimbo', () => {
    const address = makeAddress({
      street: 'Avenida Puglisi',
      streetNumber: '490',
      district: 'Centro',
      city: 'Guarujá',
      region: 'São Paulo',
      postalCode: '11410-002',
    });

    expect(formatGeocodedAddress(address)).toBe(
      'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
    );
  });

  it('separa o bairro com traço, e não com vírgula', () => {
    const address = makeAddress({
      street: 'Rua Azuíl Loureiro',
      streetNumber: '1395',
      district: 'Vila Santa Rosa',
      city: 'Guarujá',
      region: 'São Paulo',
      postalCode: '11430-111',
    });

    expect(formatGeocodedAddress(address)).toBe(
      'R. Azuíl Loureiro, 1395 - Vila Santa Rosa, Guarujá - SP, 11430-111',
    );
  });

  it('omite o número quando o GPS não o resolve', () => {
    const address = makeAddress({
      street: 'Avenida Puglisi',
      district: 'Centro',
      city: 'Guarujá',
      region: 'São Paulo',
    });

    expect(formatGeocodedAddress(address)).toBe('Av. Puglisi - Centro, Guarujá - SP');
  });

  it('cai para a sub-região quando não há cidade', () => {
    const address = makeAddress({ subregion: 'Baixada Santista', region: 'São Paulo' });

    expect(formatGeocodedAddress(address)).toBe('Baixada Santista - SP');
  });

  it('devolve string vazia quando nada foi resolvido', () => {
    expect(formatGeocodedAddress(makeAddress({}))).toBe('');
  });

  it('não deixa separador órfão quando só há rua', () => {
    const address = makeAddress({ street: 'Avenida Puglisi' });

    expect(formatGeocodedAddress(address)).toBe('Av. Puglisi');
  });
});
