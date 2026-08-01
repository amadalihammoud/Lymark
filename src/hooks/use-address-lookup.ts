import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import { formatGeocodedAddress } from '@/lib/address';

/**
 * Preenche o campo "Endereço / Local" a partir do GPS.
 *
 * Devolve o endereço em vez de escrevê-lo direto no rascunho: quem decide o
 * que fazer com o resultado é a tela, e o hook continua testável e sem
 * acoplamento ao contexto de captura.
 */

export type AddressLookupStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';

export function useAddressLookup() {
  const [status, setStatus] = useState<AddressLookupStatus>('idle');

  const lookup = useCallback(async (): Promise<string | null> => {
    setStatus('loading');

    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync(position.coords);
      if (!address) {
        setStatus('unavailable');
        return null;
      }

      const formatted = formatGeocodedAddress(address);
      if (!formatted) {
        setStatus('unavailable');
        return null;
      }

      setStatus('success');
      return formatted;
    } catch (error) {
      console.warn('[location] não foi possível obter o endereço.', error);
      setStatus('unavailable');
      return null;
    }
  }, []);

  return { status, lookup, isLoading: status === 'loading' };
}
