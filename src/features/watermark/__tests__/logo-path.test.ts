import { isManagedLogoPath } from '../logo-path';

/**
 * O caminho do logotipo vem de JSON no disco, que pode estar corrompido ou ter
 * sido editado. Sem esta validação, um valor arbitrário faria o app ler um
 * arquivo qualquer do aparelho e carimbá-lo na foto que o técnico entrega ao
 * cliente — e o mesmo caminho voltaria a ser lido em toda abertura seguinte.
 */
describe('isManagedLogoPath', () => {
  it('aceita o que o próprio app grava', () => {
    expect(isManagedLogoPath('brand/8f14e45f-ceea-467a-9e58-1d2c0b1a2b3c.png')).toBe(true);
    expect(isManagedLogoPath('brand/8f14e45f-ceea-467a-9e58-1d2c0b1a2b3c.jpg')).toBe(true);
    expect(isManagedLogoPath('brand/8f14e45f-ceea-467a-9e58-1d2c0b1a2b3c.webp')).toBe(true);
  });

  it('recusa caminho fora do diretório gerido', () => {
    expect(isManagedLogoPath('exports/abc.jpg')).toBe(false);
    expect(isManagedLogoPath('/etc/passwd')).toBe(false);
    expect(isManagedLogoPath('file:///data/user/0/app/files/brand/abc.png')).toBe(false);
  });

  it('recusa travessia de diretório', () => {
    // `..` num segmento sairia do diretório do app inteiro. A lista de
    // permissão fecha isso pela forma, e não caçando o padrão.
    expect(isManagedLogoPath('brand/../../secret.png')).toBe(false);
    expect(isManagedLogoPath('brand/sub/abc.png')).toBe(false);
  });

  it('recusa extensão que o Skia não decodifica', () => {
    expect(isManagedLogoPath('brand/abc.svg')).toBe(false);
    expect(isManagedLogoPath('brand/abc.pdf')).toBe(false);
    expect(isManagedLogoPath('brand/abc')).toBe(false);
  });

  it('recusa o que não é texto', () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(isManagedLogoPath(bad)).toBe(false);
    }
  });
});
