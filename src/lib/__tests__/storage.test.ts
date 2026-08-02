import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys, readJson, writeJson } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

/**
 * A distinção entre "não há nada gravado" e "não consegui ler" é a razão de
 * este módulo existir, e já foi quebrada uma vez: uma falha momentânea de
 * leitura era tratada como ausência, o app subia com a lista vazia e o efeito
 * de gravação seguinte apagava um histórico que continuava íntegro no disco.
 *
 * Nada impedia a regressão — este arquivo não tinha teste nenhum.
 */
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('readJson', () => {
  it('devolve o valor quando há dado gravado', async () => {
    getItem.mockResolvedValue('{"scale":"large"}');

    await expect(readJson(StorageKeys.watermarkPreferences)).resolves.toEqual({
      status: 'found',
      value: { scale: 'large' },
    });
  });

  it('trata chave inexistente como vazio — gravar é seguro', async () => {
    getItem.mockResolvedValue(null);

    await expect(readJson(StorageKeys.gallery)).resolves.toEqual({ status: 'empty' });
  });

  it('trata `undefined` como vazio', async () => {
    // Nem toda implementação devolve `null` para chave ausente.
    getItem.mockResolvedValue(undefined);

    await expect(readJson(StorageKeys.gallery)).resolves.toEqual({ status: 'empty' });
  });

  it('NÃO trata falha de leitura como vazio — é aqui que a perda acontecia', async () => {
    const error = new Error('database disk image is malformed');
    getItem.mockRejectedValue(error);

    const result = await readJson(StorageKeys.gallery);

    expect(result.status).toBe('failed');
    expect(result).toMatchObject({ error });
    // O ponto: `failed` é o que trava a gravação. Se virasse `empty`, o
    // histórico íntegro no disco seria sobrescrito por uma lista vazia.
    expect(result.status).not.toBe('empty');
  });

  it('trata JSON corrompido como falha, e não como ausência', async () => {
    getItem.mockResolvedValue('{"entries":[{"id"');

    const result = await readJson(StorageKeys.gallery);

    expect(result.status).toBe('failed');
    // O conteúdo original permanece em disco: não é apagado nem sobrescrito
    // aqui, para continuar recuperável à mão.
    expect(setItem).not.toHaveBeenCalled();
  });

  it('não confunde os valores JSON falsos com ausência', async () => {
    for (const raw of ['0', 'false', '""', 'null']) {
      getItem.mockResolvedValue(raw);

      const result = await readJson(StorageKeys.gallery);

      // Todos são JSON válido: o módulo devolve `found`. Cabe a quem consome
      // validar a forma — `mergeWithDefaults` trata o `null` explicitamente.
      expect(result.status).toBe('found');
    }
  });

  it('lê a chave exata, com o prefixo do app', async () => {
    getItem.mockResolvedValue(null);
    await readJson(StorageKeys.gallery);

    expect(getItem).toHaveBeenCalledWith('lymark:gallery');
  });
});

describe('writeJson', () => {
  it('serializa o valor sob a chave', async () => {
    setItem.mockResolvedValue(undefined);
    await writeJson(StorageKeys.gallery, [{ id: 'a' }]);

    expect(setItem).toHaveBeenCalledWith('lymark:gallery', '[{"id":"a"}]');
  });

  it('não propaga falha de gravação', async () => {
    // Disco cheio no meio de uma exportação não pode derrubar a tela: a
    // imagem já existe, e o alerta ao usuário é responsabilidade de quem chama.
    setItem.mockRejectedValue(new Error('SQLITE_FULL'));

    await expect(writeJson(StorageKeys.gallery, [])).resolves.toBeUndefined();
  });
});
