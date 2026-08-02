import { isManagedPath, normalizeStoredPath } from '../photo-file';

/**
 * `deleteExportedPhoto` apaga arquivo. O que decide se ele apaga é
 * `isManagedPath`, então esta é uma fronteira de segurança: um caminho vindo
 * de JSON corrompido no disco não pode fazer o app apagar algo que não é dele.
 */
describe('isManagedPath', () => {
  it('aceita o formato que o módulo gera', () => {
    expect(isManagedPath('exports/0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.jpg')).toBe(true);
  });

  it('recusa travessia de diretório', () => {
    expect(isManagedPath('exports/../../../etc/passwd')).toBe(false);
    expect(isManagedPath('exports/..%2Fsecret.jpg')).toBe(false);
    expect(isManagedPath('../exports/a.jpg')).toBe(false);
  });

  it('recusa caminho absoluto e URI', () => {
    expect(isManagedPath('/var/mobile/exports/a.jpg')).toBe(false);
    expect(isManagedPath('file:///data/exports/a.jpg')).toBe(false);
  });

  it('recusa diretório irmão de nome parecido', () => {
    expect(isManagedPath('exports-evil/a.jpg')).toBe(false);
    expect(isManagedPath('outro/a.jpg')).toBe(false);
  });

  it('recusa profundidade extra e extensão diferente', () => {
    expect(isManagedPath('exports/sub/a.jpg')).toBe(false);
    expect(isManagedPath('exports/a.png')).toBe(false);
    expect(isManagedPath('exports/a')).toBe(false);
  });

  it('recusa o que nem string é', () => {
    expect(isManagedPath(null)).toBe(false);
    expect(isManagedPath(undefined)).toBe(false);
    expect(isManagedPath(42)).toBe(false);
    expect(isManagedPath({})).toBe(false);
  });
});

/**
 * A versão anterior gravava URI absoluta. No iOS o identificador do contêiner
 * muda a cada atualização do app, então esses registros precisam ser
 * recuperados pelo trecho final, que sobrevive à troca.
 */
describe('normalizeStoredPath', () => {
  const fileName = '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.jpg';

  it('deixa passar o formato atual', () => {
    expect(normalizeStoredPath(`exports/${fileName}`)).toBe(`exports/${fileName}`);
  });

  it('recupera registro que gravava URI absoluta', () => {
    const legacy = `file:///data/user/0/com.lycosteam.lymark/files/exports/${fileName}`;

    expect(normalizeStoredPath(legacy)).toBe(`exports/${fileName}`);
  });

  it('recupera mesmo quando o contêiner do iOS mudou de identificador', () => {
    const stale = `file:///var/mobile/Containers/Data/Application/OUTRO-UUID/Documents/exports/${fileName}`;

    expect(normalizeStoredPath(stale)).toBe(`exports/${fileName}`);
  });

  it('descarta o que não é recuperável', () => {
    expect(normalizeStoredPath('file:///tmp/qualquer.jpg')).toBeNull();
    expect(normalizeStoredPath('exports/../fora.jpg')).toBeNull();
    expect(normalizeStoredPath(null)).toBeNull();
    expect(normalizeStoredPath(123)).toBeNull();
  });
});
