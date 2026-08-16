/**
 * Cada par `.ts` / `.web.ts` precisa expor a MESMA superfície.
 *
 * O Metro escolhe o arquivo em tempo de bundle, então quem consome importa
 * `./photo-file` e recebe um dos dois sem saber qual. Se um lado ganhar ou
 * perder um export, o outro quebra em tempo de execução — e nada avisa: o
 * `tsc` resolve sempre o `.ts`, então uma divergência no `.web.ts` passa
 * despercebida por ele.
 *
 * Aqui a comparação é entre OS DOIS MÓDULOS, nunca contra uma lista escrita à
 * mão. Lista fixa não testa nada: quando diverge, a saída fácil é editar a
 * lista, e foi assim que este arquivo já nasceu uma vez.
 *
 * Falha ao carregar qualquer um dos lados QUEBRA o teste de propósito — é
 * bug, não caso a tratar. Nada de try/catch aqui.
 */

/**
 * O `expo-media-library` não carrega sob o Jest — o módulo nativo do SDK 57
 * quebra na herança de classe fora do aparelho:
 *
 *   TypeError: Super expression must either be null or a function
 *     at expo-media-library/src/index.ts:16
 *
 * O mock é dirigido a ele e nada mais. Aqui só interessa que os módulos
 * CARREGUEM para que suas superfícies sejam comparadas; nenhuma destas
 * funções é chamada. Um mock mais amplo mascararia divergência real.
 */
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  Asset: { create: jest.fn() },
}));

/**
 * O `@shopify/react-native-skia` é ESM puro e não carrega sob o Jest sem o
 * aparelho. `logo-image.ts` o importa para preparar o logotipo, e os dois
 * lados de `logo-file` importam `logo-image`. O mock é vazio de propósito:
 * nada dele é chamado aqui — só a superfície dos módulos é comparada.
 */
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {},
  AlphaType: {},
  ColorType: {},
  ImageFormat: {},
}));

const PARES: { nome: string; nativo: string; web: string }[] = [
  {
    nome: 'photo-file',
    nativo: '@/features/watermark/photo-file',
    web: '@/features/watermark/photo-file.web',
  },
  {
    nome: 'export-photo',
    nativo: '@/features/watermark/export-photo',
    web: '@/features/watermark/export-photo.web',
  },
  {
    nome: 'logo-file',
    nativo: '@/features/watermark/logo-file',
    web: '@/features/watermark/logo-file.web',
  },
  {
    nome: 'use-app-permissions',
    nativo: '@/hooks/use-app-permissions',
    web: '@/hooks/use-app-permissions.web',
  },
];

describe('paridade de superfície entre plataformas', () => {
  for (const { nome, nativo, web } of PARES) {
    it(`${nome}: nativo e web exportam os mesmos nomes`, () => {
      const moduloNativo = require(nativo);
      const moduloWeb = require(web);

      expect(Object.keys(moduloWeb).sort()).toEqual(Object.keys(moduloNativo).sort());
    });

    it(`${nome}: os exports correspondentes têm o mesmo tipo`, () => {
      const moduloNativo = require(nativo);
      const moduloWeb = require(web);

      // Um export que vira objeto de um lado e função do outro passa na
      // comparação de nomes e quebra na chamada.
      for (const chave of Object.keys(moduloNativo)) {
        expect(typeof moduloWeb[chave]).toBe(typeof moduloNativo[chave]);
      }
    });
  }
});
