import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Camada fina sobre o AsyncStorage.
 *
 * A leitura devolve um resultado discriminado, e essa distinção é o ponto
 * central deste módulo: "não existe nada gravado" e "não consegui ler" são
 * situações opostas. Tratar as duas como ausência faria o app inicializar
 * com o padrão e, no efeito de gravação seguinte, sobrescrever um dado que
 * continuava íntegro no disco — perda permanente causada por uma falha
 * temporária de leitura.
 */

const NAMESPACE = 'lymark';

export const StorageKeys = {
  watermarkPreferences: `${NAMESPACE}:watermark-preferences`,
  gallery: `${NAMESPACE}:gallery`,
  locale: `${NAMESPACE}:locale`,
  entitlement: `${NAMESPACE}:entitlement`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export type ReadResult<T> =
  /** Havia dado gravado e ele foi lido. */
  | { status: 'found'; value: T }
  /** A chave não existe — primeira execução. Gravar é seguro. */
  | { status: 'empty' }
  /** Falha de leitura ou dado corrompido. Gravar destruiria o original. */
  | { status: 'failed'; error: unknown };

export async function readJson<T>(key: StorageKey): Promise<ReadResult<T>> {
  let raw: string | null;

  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[storage] falha ao ler "${key}".`, error);
    return { status: 'failed', error };
  }

  if (raw == null) return { status: 'empty' };

  try {
    return { status: 'found', value: JSON.parse(raw) as T };
  } catch (error) {
    // JSON inválido é dado corrompido, não ausência: preservamos o original
    // em disco para não descartar o que talvez seja recuperável à mão.
    console.warn(`[storage] conteúdo inválido em "${key}".`, error);
    return { status: 'failed', error };
  }
}

export async function writeJson<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] falha ao gravar "${key}".`, error);
  }
}

export async function remove(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] falha ao remover "${key}".`, error);
  }
}
