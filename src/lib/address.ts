import type { LocationGeocodedAddress } from 'expo-location';

/**
 * Monta o endereço no formato que aparece na marca d'água:
 * `Av. Manoel Domingos Cravo, 257 - Jardim Nancy, Guarujá - SP, 11430-080`
 *
 * O reverse geocode devolve campos faltando com frequência (zona rural,
 * endereço novo, GPS impreciso), então cada trecho só entra se existir e
 * os separadores são aplicados sobre o que sobrou.
 */
export function formatGeocodedAddress(address: LocationGeocodedAddress): string {
  const street = [address.street, address.streetNumber].filter(Boolean).join(', ');
  const locality = [address.district, address.city ?? address.subregion]
    .filter(Boolean)
    .join(', ');
  const cityState = [locality, address.region].filter(Boolean).join(' - ');

  return [street, cityState, address.postalCode].filter(Boolean).join(', ');
}
