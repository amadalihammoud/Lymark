import type { LocationGeocodedAddress } from 'expo-location';

import { formatGeocodedAddress } from '../address';

/**
 * O reverse geocode devolve campos faltando com frequência — zona rural,
 * endereço novo, GPS impreciso. O formato precisa degradar sem deixar
 * vírgulas soltas ou traços órfãos na foto.
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

describe('formatGeocodedAddress', () => {
  it('monta o endereço completo', () => {
    const address = makeAddress({
      street: 'Av. Manoel Domingos Cravo',
      streetNumber: '257',
      district: 'Jardim Nancy',
      city: 'Guarujá',
      region: 'SP',
      postalCode: '11430-080',
    });

    expect(formatGeocodedAddress(address)).toBe(
      'Av. Manoel Domingos Cravo, 257, Jardim Nancy, Guarujá - SP, 11430-080',
    );
  });

  it('omite o número quando o GPS não o resolve', () => {
    const address = makeAddress({
      street: 'Av. Manoel Domingos Cravo',
      city: 'Guarujá',
      region: 'SP',
    });

    expect(formatGeocodedAddress(address)).toBe('Av. Manoel Domingos Cravo, Guarujá - SP');
  });

  it('cai para a sub-região quando não há cidade', () => {
    const address = makeAddress({ subregion: 'Baixada Santista', region: 'SP' });

    expect(formatGeocodedAddress(address)).toBe('Baixada Santista - SP');
  });

  it('devolve string vazia quando nada foi resolvido', () => {
    expect(formatGeocodedAddress(makeAddress({}))).toBe('');
  });
});
