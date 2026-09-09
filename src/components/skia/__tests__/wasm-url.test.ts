/**
 * A guarda do caminho do `canvaskit.wasm`.
 *
 * O defeito que ela impede de voltar: o arquivo era pedido por caminho relativo
 * sobre o `document.baseURI`, que numa exportação estática é a URL da rota
 * atual. Toda rota abaixo da raiz pedia o arquivo no lugar errado, o Skia não
 * inicializava e o aplicativo abria em branco — sem erro na tela, o que fez o
 * defeito passar por "o app não carregou".
 *
 * O caso da raiz é o que torna isto traiçoeiro: ali o caminho relativo acerta
 * por coincidência. Um teste só com a home passaria e não protegeria nada.
 *
 * O caso `/web` cobre o export hospedado em lymark.app/web: sem o base path o
 * pedido ia para a raiz do domínio e dava 404, mesmo com o arquivo em
 * `/web/canvaskit.wasm`.
 */

import { canvasKitWasmUrl } from '../wasm-url';

describe('canvasKitWasmUrl', () => {
  const previousExpo = process.env.EXPO_BASE_URL;
  const previousLymark = process.env.LYMARK_WEB_BASE;

  beforeEach(() => {
    delete process.env.EXPO_BASE_URL;
    delete process.env.LYMARK_WEB_BASE;
  });

  afterAll(() => {
    if (previousExpo === undefined) delete process.env.EXPO_BASE_URL;
    else process.env.EXPO_BASE_URL = previousExpo;
    if (previousLymark === undefined) delete process.env.LYMARK_WEB_BASE;
    else process.env.LYMARK_WEB_BASE = previousLymark;
  });

  it('pede na raiz a partir da home', () => {
    expect(canvasKitWasmUrl('https://app.lymark.app/')).toBe(
      'https://app.lymark.app/canvaskit.wasm',
    );
  });

  it.each([
    'https://app.lymark.app/settings',
    'https://app.lymark.app/settings/language',
    'https://app.lymark.app/settings/watermark',
    'https://app.lymark.app/gallery',
    'https://app.lymark.app/batch',
    'https://app.lymark.app/photo/a1b2c3',
  ])('pede na raiz a partir de %s', (baseURI) => {
    expect(canvasKitWasmUrl(baseURI)).toBe('https://app.lymark.app/canvaskit.wasm');
  });

  it('não sai da origem do Electron', () => {
    // No empacotado a origem é `app://lymark/`. Um caminho absoluto cru
    // apontaria para fora do protocolo e o Skia nunca carregaria.
    expect(canvasKitWasmUrl('app://lymark/settings/language')).toBe(
      'app://lymark/canvaskit.wasm',
    );
  });

  it('preserva a porta do servidor de desenvolvimento', () => {
    expect(canvasKitWasmUrl('http://localhost:8081/gallery')).toBe(
      'http://localhost:8081/canvaskit.wasm',
    );
  });

  it('ignora consulta e fragmento da rota', () => {
    expect(canvasKitWasmUrl('https://app.lymark.app/photo/x?share=1#topo')).toBe(
      'https://app.lymark.app/canvaskit.wasm',
    );
  });

  describe('com base path /web (export hospedado)', () => {
    it('respeita EXPO_BASE_URL a partir da home hospedada', () => {
      process.env.EXPO_BASE_URL = '/web';
      expect(canvasKitWasmUrl('https://lymark.app/web/')).toBe(
        'https://lymark.app/web/canvaskit.wasm',
      );
    });

    it.each([
      'https://lymark.app/web/settings',
      'https://lymark.app/web/settings/language',
      'https://lymark.app/web/gallery',
      'https://lymark.app/web/photo/a1b2c3',
    ])('respeita EXPO_BASE_URL a partir de %s', (baseURI) => {
      process.env.EXPO_BASE_URL = '/web';
      expect(canvasKitWasmUrl(baseURI)).toBe('https://lymark.app/web/canvaskit.wasm');
    });

    it('aceita LYMARK_WEB_BASE quando EXPO_BASE_URL não está definido', () => {
      process.env.LYMARK_WEB_BASE = '/web';
      expect(canvasKitWasmUrl('https://lymark.app/web/settings/language')).toBe(
        'https://lymark.app/web/canvaskit.wasm',
      );
    });

    it('normaliza barra final em EXPO_BASE_URL', () => {
      process.env.EXPO_BASE_URL = '/web/';
      expect(canvasKitWasmUrl('https://lymark.app/web/gallery')).toBe(
        'https://lymark.app/web/canvaskit.wasm',
      );
    });
  });
});
