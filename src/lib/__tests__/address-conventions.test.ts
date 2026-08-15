import type { LocationGeocodedAddress } from 'expo-location';

import { conventionFor, DEFAULT_CONVENTION } from '../address-conventions';
import { formatGeocodedAddress, trimToFit } from '../address';

/**
 * O endereço é dado de comprovação. Um endereço fora da ordem local levanta
 * dúvida sobre o documento inteiro — e uma abreviação inventada num idioma
 * que ninguém verificou é pior ainda, porque parece certa.
 */

const base: LocationGeocodedAddress = {
  city: null,
  district: null,
  streetNumber: null,
  street: null,
  region: null,
  subregion: null,
  country: null,
  postalCode: null,
  name: null,
  isoCountryCode: null,
  timezone: null,
  formattedAddress: null,
};

const endereco = (parts: Partial<LocationGeocodedAddress>): LocationGeocodedAddress => ({
  ...base,
  ...parts,
});

describe('conventionFor', () => {
  it('a França põe o número antes, ao contrário da vizinhança continental', () => {
    expect(conventionFor('FR').numberFirst).toBe(true);
    expect(conventionFor('DE').numberFirst).toBe(false);
    expect(conventionFor('IT').numberFirst).toBe(false);
  });

  it('Japão, China e Coreia escrevem do maior para o menor', () => {
    for (const code of ['JP', 'CN', 'KR']) {
      expect(conventionFor(code).majorToMinor).toBe(true);
    }
    expect(conventionFor('BR').majorToMinor).toBe(false);
  });

  it('coloca o código postal onde cada país o escreve', () => {
    expect(conventionFor('DE').postal).toBe('before-city');
    expect(conventionFor('US').postal).toBe('after-region');
    expect(conventionFor('GB').postal).toBe('last');
    expect(conventionFor('JP').postal).toBe('first');
  });

  it('não distingue maiúsculas nem espaço em volta', () => {
    expect(conventionFor(' fr ').numberFirst).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['vazio', ''],
    ['de tamanho errado', 'BRA'],
  ])('cai no padrão para código %s', (_nome, code) => {
    expect(conventionFor(code)).toEqual(DEFAULT_CONVENTION);
  });

  it('um país fora da tabela recebe o padrão, e não um erro', () => {
    // A tabela cresce quando um mercado aparecer e alguém puder confirmar a
    // convenção. Até lá, o endereço sai legível.
    expect(conventionFor('IS')).toEqual({
      numberFirst: false,
      majorToMinor: false,
      postal: 'before-city',
    });
    expect(conventionFor('UY')).toEqual(DEFAULT_CONVENTION);
  });
});

describe('formatGeocodedAddress em cada convenção', () => {
  it('Brasil: abrevia logradouro e estado, bairro depois do traço', () => {
    const brasil = endereco({
      isoCountryCode: 'BR',
      street: 'Avenida Puglisi',
      streetNumber: '490',
      district: 'Centro',
      city: 'Guarujá',
      region: 'São Paulo',
      postalCode: '11410-002',
    });

    expect(formatGeocodedAddress(brasil)).toBe(
      'Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002',
    );
  });

  it('França: número antes do logradouro, postal antes da cidade', () => {
    const franca = endereco({
      isoCountryCode: 'FR',
      street: 'rue de Rivoli',
      streetNumber: '12',
      city: 'Paris',
      postalCode: '75001',
    });

    expect(formatGeocodedAddress(franca)).toBe('12 rue de Rivoli, 75001 Paris');
  });

  it('Alemanha: número depois do logradouro, postal antes da cidade', () => {
    const alemanha = endereco({
      isoCountryCode: 'DE',
      street: 'Hauptstraße',
      streetNumber: '12',
      city: 'Berlin',
      postalCode: '10115',
    });

    expect(formatGeocodedAddress(alemanha)).toBe('Hauptstraße 12, 10115 Berlin');
  });

  it('Estados Unidos: número antes, estado e ZIP depois da cidade', () => {
    const eua = endereco({
      isoCountryCode: 'US',
      street: '8th Avenue',
      streetNumber: '111',
      city: 'New York',
      region: 'NY',
      postalCode: '10011',
    });

    expect(formatGeocodedAddress(eua)).toBe('111 8th Avenue, New York, NY 10011');
  });

  it('Japão: postal abrindo a linha, do maior para o menor', () => {
    const japao = endereco({
      isoCountryCode: 'JP',
      region: '東京都',
      city: '千代田区',
      street: '千代田',
      streetNumber: '1-1',
      postalCode: '〒100-0001',
    });

    expect(formatGeocodedAddress(japao)).toBe('〒100-0001 東京都, 千代田区, 千代田 1-1');
  });

  it('não abrevia logradouro fora do Brasil', () => {
    // "Avenue" continua "Avenue". Inventar "Ave." num país cuja convenção
    // ninguém verificou é pior do que não abreviar.
    const eua = endereco({
      isoCountryCode: 'US',
      street: 'Avenue of the Americas',
      streetNumber: '1200',
      city: 'New York',
    });

    expect(formatGeocodedAddress(eua)).toContain('Avenue of the Americas');
  });

  it('cai no endereço que o sistema formatou quando faltam componentes', () => {
    // O geocodificador do Android já monta na convenção do país. Ninguém tem
    // tabela melhor que a do próprio sistema.
    const escasso = endereco({
      isoCountryCode: 'VN',
      formattedAddress: '1 Đường Lê Duẩn, Bến Nghé, Quận 1',
    });

    expect(formatGeocodedAddress(escasso)).toBe('1 Đường Lê Duẩn, Bến Nghé, Quận 1');
  });

  it('não deixa separador solto quando um campo falta', () => {
    const semNumero = endereco({
      isoCountryCode: 'DE',
      street: 'Hauptstraße',
      city: 'Berlin',
      postalCode: '10115',
    });

    const saida = formatGeocodedAddress(semNumero);

    expect(saida).toBe('Hauptstraße, 10115 Berlin');
    expect(saida).not.toMatch(/,\s*,|,\s*$|^\s*,/);
  });
});

describe('trimToFit', () => {
  it('deixa em paz o que já cabe', () => {
    expect(trimToFit('Hauptstraße 12, 10115 Berlin')).toBe('Hauptstraße 12, 10115 Berlin');
  });

  it('descarta do fim, preservando logradouro e localidade', () => {
    const longo = 'Avenue of the Americas 1200, Midtown Manhattan, New York, NY 10036, United States';

    const curto = trimToFit(longo, 50);

    expect(curto).toContain('Avenue of the Americas 1200');
    expect(curto).toContain('Midtown Manhattan');
    expect(curto).not.toContain('United States');
  });

  it('nunca reescreve palavra — só remove componente', () => {
    // O que sobra continua verdadeiro porque nunca foi inventado.
    const longo = 'Kaiser-Wilhelm-Straße 145, Charlottenburg, 10585 Berlin, Deutschland';

    const curto = trimToFit(longo, 40);

    expect(curto).toContain('Kaiser-Wilhelm-Straße 145');
    expect(longo).toContain(curto.split(', ')[0]);
  });

  it('preserva os dois primeiros trechos mesmo quando eles sozinhos estouram', () => {
    // Sem logradouro e localidade, o carimbo deixa de responder "onde" — que
    // é a única coisa que ele existe para responder.
    const longo = 'Um logradouro absurdamente comprido, Uma localidade também comprida, CEP';

    expect(trimToFit(longo, 10).split(', ')).toHaveLength(2);
  });
});

describe('país desconhecido', () => {
  it('segue o caminho brasileiro, e as abreviações são inertes lá fora', () => {
    // `abbreviateStreet` só reage a "Avenida", "Rua" e afins; `abbreviateState`
    // só conhece as 27 unidades federativas. Uma "Hauptstraße" atravessa as
    // duas sem ser tocada — é o que torna esse fallback seguro.
    const semPais = endereco({
      street: 'Hauptstraße',
      streetNumber: '12',
      city: 'Berlin',
      region: 'Berlin',
    });

    expect(formatGeocodedAddress(semPais)).toContain('Hauptstraße');
    expect(formatGeocodedAddress(semPais)).not.toContain('Str.');
  });

  it('preserva a abreviação brasileira, que é o mercado onde o app roda hoje', () => {
    const semPais = endereco({
      street: 'Avenida Puglisi',
      streetNumber: '490',
      city: 'Guarujá',
      region: 'São Paulo',
    });

    expect(formatGeocodedAddress(semPais)).toBe('Av. Puglisi, 490, Guarujá - SP');
  });
});
