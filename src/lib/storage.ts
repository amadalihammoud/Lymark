import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Camada fina sobre o AsyncStorage.
 *
 * Duas garantias para quem chama: as chaves ficam todas num namespace só
 * (`StorageKeys`), e uma leitura nunca lança — dado corrompido ou de uma
 * versão antiga do app devolve o fallback em vez de derrubar a tela.
 */

const NAMESPACE = 'lymark';

export const StorageKeys = {
  watermarkPreferences: `${NAMESPACE}:watermark-preferences`,
  gallery: `${NAMESPACE}:gallery`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] falha ao ler "${key}", usando padrão.`, error);
    return fallback;
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
