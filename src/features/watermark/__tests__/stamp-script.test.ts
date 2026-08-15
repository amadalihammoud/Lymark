import { DEFAULT_WATERMARK_PREFERENCES } from '../preferences';
import { scriptFor, scriptForStamp, stampText } from '../stamp-script';

import type { CaptureMetadata, WatermarkPreferences } from '@/types';

/**
 * A escolha da fonte olha o conteúdo, não a preferência de idioma — porque o
 * endereço vem do geocodificador, no alfabeto do país onde a foto foi tirada.
 */

describe('scriptFor', () => {
  it('latim, com acento e pontuação de endereço', () => {
    expect(scriptFor('12 ago. 2026', 'Sáb', 'Av. Puglisi, 490 - Guarujá - SP')).toBe('latin');
  });

  it('cirílico', () => {
    expect(scriptFor('12 авг. 2026', 'ср', 'ул. Пушкина, 10')).toBe('cyrillic');
  });

  it('grego usa a mesma fonte do cirílico', () => {
    // Roboto Condensed cobre os dois, então não vale gastar uma categoria.
    expect(scriptFor('Αύγ')).toBe('cyrillic');
  });

  it('endereço em cirílico com data em latim ainda pede a fonte cirílica', () => {
    // O caso do técnico brasileiro trabalhando na Rússia: interface em
    // português, endereço em russo.
    expect(scriptFor('12 ago. 2026', 'Sáb', 'ул. Пушкина, 10, Москва')).toBe('cyrillic');
  });

  it.each([
    ['árabe', 'شارع الملك'],
    ['japonês', '東京都千代田区'],
    ['chinês', '北京市朝阳区'],
    ['coreano', '서울특별시'],
    ['tailandês', 'ถนนสุขุมวิท'],
    ['hebraico', 'רחוב הרצל'],
    ['híndi', 'महात्मा गांधी रोड'],
  ])('%s ainda não tem fonte', (_nome, texto) => {
    expect(scriptFor(texto)).toBe('unsupported');
  });

  it('um caractere sem fonte contamina o carimbo inteiro', () => {
    // O carimbo desenha com uma fonte só. Uma linha ilegível compromete a
    // foto, então não adianta o resto ser latim.
    expect(scriptFor('12 ago. 2026', '東京都')).toBe('unsupported');
  });

  it('alfabeto desconhecido cai no lado seguro', () => {
    // A faixa é declarada pelo que é aceito. Um script novo entra como sem
    // suporte por padrão, em vez de ser desenhado com a fonte errada.
    expect(scriptFor('Ⴀⴀ')).toBe('unsupported');
  });

  it.each([
    ['vazio', []],
    ['nulos', [null, undefined]],
    ['só espaço', ['   ']],
  ])('%s é latim, que é o padrão do carimbo', (_nome, entradas) => {
    expect(scriptFor(...(entradas as (string | null | undefined)[]))).toBe('latin');
  });

  it('números, símbolos de moeda e travessão não mudam a decisão', () => {
    expect(scriptFor('07:42 — R$ 1.200,00 · 98926A73655DC1')).toBe('latin');
  });

  it('o "№" sozinho já pede a Roboto Condensed', () => {
    // A Barlow não tem este glifo, e a decisão é por cobertura, não por
    // alfabeto: um endereço em latim com "№" ainda precisa da outra fonte.
    expect(scriptFor('Rua Mendes, № 10')).toBe('cyrillic');
  });

  it('acento decomposto não derruba o texto para sem-suporte', () => {
    // O trema como caractere separado. Sem a normalização, o sinal combinante
    // não existiria na Roboto Condensed e o endereço russo ao lado cairia
    // inteiro para a Barlow, que não tem um glifo cirílico sequer.
    expect(scriptFor(decomposto('M\u00fcller'))).toBe('latin');
    expect(scriptFor(decomposto('M\u00fcller, \u041c\u043e\u0441\u043a\u0432\u0430'))).toBe('cyrillic');
  });
});

/** A mesma palavra, com o acento escrito como caractere separado. */
const decomposto = (texto: string) => texto.normalize('NFD');

describe('stampText', () => {
  it('compõe o acento num caractere só', () => {
    // `drawText` não faz shaping: um sinal combinante seria desenhado ao lado
    // da letra, avançando o cursor — "Mu¨ller" impresso na foto.
    expect(decomposto('M\u00fcller')).toHaveLength(7); // M u ¨ l l e r
    expect(stampText(decomposto('M\u00fcller'))).toBe('M\u00fcller');
    expect(stampText(decomposto('Guaruj\u00e1'))).toBe('Guaruj\u00e1');
  });

  it('deixa em paz o que já está composto', () => {
    expect(stampText('Guaruj\u00e1')).toBe('Guaruj\u00e1');
    expect(stampText('\u0443\u043b. \u041f\u0443\u0448\u043a\u0438\u043d\u0430')).toBe('\u0443\u043b. \u041f\u0443\u0448\u043a\u0438\u043d\u0430');
  });
});

describe('scriptForStamp', () => {
  const metadata: CaptureMetadata = {
    time: '07:42',
    date: '12 ago. 2026',
    weekday: 'Qua',
    address: 'Av. Puglisi, 490 - Guarujá - SP',
    code: '98926A73655DC1',
  };

  const com = (extra: Partial<WatermarkPreferences>): WatermarkPreferences => ({
    ...DEFAULT_WATERMARK_PREFERENCES,
    ...extra,
  });

  it('carimbo brasileiro comum é latim', () => {
    expect(scriptForStamp(metadata, DEFAULT_WATERMARK_PREFERENCES)).toBe('latin');
  });

  it('endereço em cirílico troca a fonte', () => {
    expect(
      scriptForStamp({ ...metadata, address: 'ул. Пушкина, 10' }, DEFAULT_WATERMARK_PREFERENCES),
    ).toBe('cyrillic');
  });

  it('campo escondido não decide a fonte do que aparece', () => {
    // O endereço em cirílico não chega à foto; trocar a fonte por causa dele
    // mudaria o desenho de tudo que chega, sem motivo visível.
    const preferencias = com({
      visibleFields: { ...DEFAULT_WATERMARK_PREFERENCES.visibleFields, address: false },
    });

    expect(scriptForStamp({ ...metadata, address: 'ул. Пушкина, 10' }, preferencias)).toBe('latin');
  });

  it('razão social própria em cirílico conta', () => {
    // A marca sai no mesmo typeface dos dados. Sem isto, o nome da empresa
    // sairia em quadradinhos com o resto da foto perfeito.
    const preferencias = com({
      brandMode: 'custom',
      brandParts: [
        { text: 'Техно', color: 'white' },
        { text: 'Сервис', color: 'amber' },
      ],
    });

    expect(scriptForStamp(metadata, preferencias)).toBe('cyrillic');
  });

  it('marca desligada não conta, mesmo preenchida', () => {
    const preferencias = com({
      showBrand: false,
      brandMode: 'custom',
      brandParts: [
        { text: 'Техно', color: 'white' },
        { text: 'Сервис', color: 'amber' },
      ],
    });

    expect(scriptForStamp(metadata, preferencias)).toBe('latin');
  });

  it('a marca do Lymark não é consultada — é latina por definição', () => {
    const preferencias = com({
      brandMode: 'lymark',
      brandParts: [
        { text: '東京', color: 'white' },
        { text: 'サービス', color: 'amber' },
      ],
    });

    expect(scriptForStamp(metadata, preferencias)).toBe('latin');
  });

  it('razão social em japonês fica sem fonte, como qualquer outro texto', () => {
    const preferencias = com({
      brandMode: 'custom',
      brandParts: [
        { text: '東京', color: 'white' },
        { text: 'サービス', color: 'amber' },
      ],
    });

    expect(scriptForStamp(metadata, preferencias)).toBe('unsupported');
  });
});
