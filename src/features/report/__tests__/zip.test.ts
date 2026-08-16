// O escritor de ZIP mora no desktop (é o processo principal quem empacota),
// mas é código puro — este teste o cobre no Jest do aplicativo.
// eslint-disable-next-line no-restricted-imports
import { buildZip } from '../../../../desktop/zip';

describe('o pacote ZIP em modo store', () => {
  it('estruturas na ordem: cabeçalho local, dados, diretório central, EOCD', () => {
    const data = Buffer.from('lymark');
    const zip = buildZip([{ name: 'relatorio.pdf', data }]);

    // Assinatura do cabeçalho local no byte zero.
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    // Os dados entram crus (store): o conteúdo aparece intacto.
    expect(zip.includes(data)).toBe(true);
    // EOCD no fim, com a contagem certa de entradas.
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 8)).toBe(1);
  });

  it('vários arquivos, incluindo subpasta, cada um com seu registro central', () => {
    const zip = buildZip([
      { name: 'relatorio.pdf', data: Buffer.from('pdf') },
      { name: 'fotos/001-a.jpg', data: Buffer.from('jpg-a') },
      { name: 'fotos/002-b.jpg', data: Buffer.from('jpg-b') },
    ]);

    const eocd = zip.length - 22;
    expect(zip.readUInt16LE(eocd + 8)).toBe(3);
    expect(zip.includes(Buffer.from('fotos/001-a.jpg'))).toBe(true);
    expect(zip.includes(Buffer.from('fotos/002-b.jpg'))).toBe(true);
  });
});
