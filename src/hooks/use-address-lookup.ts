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

export type AddressLookupStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'denied'
  /** Serviço de localização desligado no aparelho. */
  | 'disabled'
  /** Demorou demais — sinal fraco, dentro de um prédio. */
  | 'timeout'
  | 'unavailable';

/**
 * Teto de espera pelo GPS.
 *
 * `getCurrentPositionAsync` não tem timeout próprio: sem sinal, a promessa
 * simplesmente nunca resolve e o botão giraria para sempre, sem como
 * cancelar a não ser reiniciando o app.
 */
const LOCATION_TIMEOUT_MS = 12_000;

class LocationTimeout extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new LocationTimeout()), ms)),
  ]);
}

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

      // Distingue "GPS desligado" de "não consegui" — a mensagem ao usuário
      // muda completamente, e só uma das duas ele consegue resolver.
      if (!(await Location.hasServicesEnabledAsync())) {
        setStatus('disabled');
        return null;
      }

      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_TIMEOUT_MS,
      ).catch(async (error: unknown) => {
        if (!(error instanceof LocationTimeout)) throw error;
        // Última posição conhecida costuma bastar para o endereço da rua, e
        // é melhor que nada para quem está dentro de um galpão.
        return Location.getLastKnownPositionAsync();
      });

      if (!position) {
        setStatus('timeout');
        return null;
      }

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
