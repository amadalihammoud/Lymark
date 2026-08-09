/**
 * @jest-environment jsdom
 *
 * Testes para verificar que os arquivos .web.ts exportam a superfície esperada.
 *
 * NOTE: Não comparamos com o .ts porque ele tem dependências nativas que
 * não carregam no Jest. A verificação de compatibilidade de tipos é feita
 * pelos arquivos .contract.ts no typecheck.
 */

describe('platform exports', () => {
  describe('photo-file.web.ts', () => {
    it('deve exportar todas as funções e constantes esperadas', () => {
      const web = require('../photo-file.web');
      
      // Funções e constantes que devem existir
      const expectedExports = [
        'isManagedPath',
        'normalizeStoredPath', 
        'resolveExportedPhotoUri',
        'persistExportedPhoto',
        'deleteExportedPhoto',
        'writeExportedPhoto',
      ];
      
      const webKeys = Object.keys(web).sort();
      expect(webKeys).toEqual(expectedExports.sort());
    });
  });

  describe('export-photo.web.ts', () => {
    it('deve exportar todas as funções e constantes esperadas', () => {
      const web = require('../export-photo.web');
      
      // Funções que devem existir (tipos não existem em runtime)
      const expectedExports = [
        'saveToDeviceGallery',
        'shareWatermarkedPhoto',
      ];
      
      const webKeys = Object.keys(web).sort();
      expect(webKeys).toEqual(expectedExports.sort());
    });
  });

  describe('use-app-permissions.web.ts', () => {
    it('deve exportar todas as funções e constantes esperadas', () => {
      const web = require('../../../hooks/use-app-permissions.web');
      
      // Funções e constantes que devem existir (tipos não existem em runtime)
      const expectedExports = [
        'PERMISSION_IDS',
        'PERMISSION_DESCRIPTORS',
        'useAppPermissions',
      ];
      
      const webKeys = Object.keys(web).sort();
      expect(webKeys).toEqual(expectedExports.sort());
    });
  });
});
