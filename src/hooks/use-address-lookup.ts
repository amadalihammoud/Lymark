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

export type AddressLookupResult = {
  status: AddressLookupStatus;
  address: string | null;
};

export function useAddressLookup() {
  const [status, setStatus] = useState<AddressLookupStatus>('idle');

  /**
   * Devolve o desfecho junto com o endereço.
   *
   * Só o `status` do estado não serve a quem chama: ele é lido do render em
   * que o toque aconteceu, e não do render posterior à resposta. Quem
   * aguardava o `lookup` acabava mostrando a mensagem da tentativa **anterior**
   * — texto de timeout para uma permissão negada, por exemplo.
   */
  const lookup = useCallback(async (): Promise<AddressLookupResult> => {
    setStatus('loading');

    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return { status: 'denied', address: null };
      }

      // Distingue "GPS desligado" de "não consegui" — a mensagem ao usuário
      // muda completamente, e só uma das duas ele consegue resolver.
      if (!(await Location.hasServicesEnabledAsync())) {
        setStatus('disabled');
        return { status: 'disabled', address: null };
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
        return { status: 'timeout', address: null };
      }

      const [address] = await Location.reverseGeocodeAsync(position.coords);
      if (!address) {
        setStatus('unavailable');
        return { status: 'unavailable', address: null };
      }

      const formatted = formatGeocodedAddress(address);
      if (!formatted) {
        setStatus('unavailable');
        return { status: 'unavailable', address: null };
      }

      setStatus('success');
      return { status: 'success', address: formatted };
    } catch (error) {
      console.warn('[location] não foi possível obter o endereço.', error);
      setStatus('unavailable');
      return { status: 'unavailable', address: null };
    }
  }, []);

  return { status, lookup, isLoading: status === 'loading' };
}
