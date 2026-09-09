import { matchTag, resolveDeviceLocale } from '../device-locale';

/**
 * A negociação de idioma decide o que a pessoa lê na primeira abertura do
 * app — antes de existir qualquer preferência gravada. Errar aqui significa
 * abrir em português para quem configurou o aparelho em japonês.
 */

const globals = globalThis as {
  navigator?: { languages?: readonly string[] };
};

/**
 * Fixa as duas fontes que a função consulta: a lista do navegador e o palpite
 * do `Intl`. Sem fixar o `Intl`, o ambiente de teste responde `en-US` e um
 * caso de "nenhum idioma reconhecido" passaria a medir a máquina, não o código.
 */
function withDeviceLanguages<T>(
  languages: readonly string[] | undefined,
  run: () => T,
  intlLocale = 'cy-GB',
): T {
  const originalNavigator = globals.navigator;
  const originalDateTimeFormat = Intl.DateTimeFormat;

  globals.navigator = languages ? { languages } : undefined;
  // Função comum, e não arrow: o código sob teste chama `new
  // Intl.DateTimeFormat()`, e arrow não pode ser construída.
  Intl.DateTimeFormat = function DateTimeFormatStub() {
    return { resolvedOptions: () => ({ locale: intlLocale }) };
  } as unknown as typeof Intl.DateTimeFormat;

  try {
    return run();
  } finally {
    globals.navigator = originalNavigator;
    Intl.DateTimeFormat = originalDateTimeFormat;
  }
}

describe('resolveDeviceLocale', () => {
  it('aceita a etiqueta exata', () => {
    expect(withDeviceLanguages(['ja'], resolveDeviceLocale)).toBe('ja');
  });

  it('distingue português europeu de brasileiro', () => {
    expect(withDeviceLanguages(['pt-PT'], resolveDeviceLocale)).toBe('pt-PT');
    expect(withDeviceLanguages(['pt-BR'], resolveDeviceLocale)).toBe('pt');
    expect(withDeviceLanguages(['pt-AO'], resolveDeviceLocale)).toBe('pt');
    expect(withDeviceLanguages(['pt'], resolveDeviceLocale)).toBe('pt');
  });

  it('mapeia espanhol peninsular e latino-americano', () => {
    expect(withDeviceLanguages(['es-ES'], resolveDeviceLocale)).toBe('es-ES');
    expect(withDeviceLanguages(['es-419'], resolveDeviceLocale)).toBe('es-419');
    expect(withDeviceLanguages(['es-MX'], resolveDeviceLocale)).toBe('es-419');
    expect(withDeviceLanguages(['es-AR'], resolveDeviceLocale)).toBe('es-419');
    expect(withDeviceLanguages(['es'], resolveDeviceLocale)).toBe('es');
  });

  it('distingue a escrita: zh-Hant recebe o catálogo tradicional', () => {
    expect(withDeviceLanguages(['zh-Hant-TW'], resolveDeviceLocale)).toBe('zh-Hant');
    expect(withDeviceLanguages(['zh-Hant'], resolveDeviceLocale)).toBe('zh-Hant');
  });

  it('mapeia regiões chinesas sem colidir zh e zh-Hant', () => {
    expect(withDeviceLanguages(['zh-TW'], resolveDeviceLocale)).toBe('zh-Hant');
    expect(withDeviceLanguages(['zh-HK'], resolveDeviceLocale)).toBe('zh-Hant');
    expect(withDeviceLanguages(['zh-MO'], resolveDeviceLocale)).toBe('zh-Hant');
    expect(withDeviceLanguages(['zh-CN'], resolveDeviceLocale)).toBe('zh');
    expect(withDeviceLanguages(['zh-SG'], resolveDeviceLocale)).toBe('zh');
    expect(withDeviceLanguages(['zh-Hans-CN'], resolveDeviceLocale)).toBe('zh');
    expect(withDeviceLanguages(['zh'], resolveDeviceLocale)).toBe('zh');
  });

  it('aceita separador com sublinhado, que alguns aparelhos ainda usam', () => {
    expect(withDeviceLanguages(['es_MX'], resolveDeviceLocale)).toBe('es-419');
    expect(withDeviceLanguages(['pt_PT'], resolveDeviceLocale)).toBe('pt-PT');
    expect(withDeviceLanguages(['zh_TW'], resolveDeviceLocale)).toBe('zh-Hant');
  });

  it('não distingue maiúsculas', () => {
    expect(withDeviceLanguages(['DE-AT'], resolveDeviceLocale)).toBe('de');
  });

  it('respeita a ordem de preferência da pessoa', () => {
    // Galês (cy) não existe no catálogo; o francês é a segunda escolha dela e
    // deve vencer o português, que é apenas o padrão do app.
    expect(withDeviceLanguages(['cy-GB', 'fr-CA', 'en'], resolveDeviceLocale)).toBe('fr');
  });

  it('cai no português quando nenhum idioma pedido existe', () => {
    expect(withDeviceLanguages(['cy-GB', 'xx-XX'], resolveDeviceLocale)).toBe('pt');
  });

  it('usa o Intl quando o navegador não expõe a lista', () => {
    expect(withDeviceLanguages(undefined, resolveDeviceLocale, 'ko-KR')).toBe('ko');
  });

  it('cai no português quando nenhuma das duas fontes serve', () => {
    expect(withDeviceLanguages(undefined, resolveDeviceLocale, 'cy-GB')).toBe('pt');
  });
});

describe('matchTag', () => {
  it('não deixa zh-Hant colidir com a primária zh', () => {
    expect(matchTag('zh-Hant-TW')).toBe('zh-Hant');
    expect(matchTag('zh-CN')).toBe('zh');
  });

  it('não deixa pt-PT / es-ES / es-419 colidir com a primária', () => {
    expect(matchTag('pt-PT')).toBe('pt-PT');
    expect(matchTag('pt-BR')).toBe('pt');
    expect(matchTag('es-ES')).toBe('es-ES');
    expect(matchTag('es-419')).toBe('es-419');
    expect(matchTag('es-MX')).toBe('es-419');
    expect(matchTag('es')).toBe('es');
  });
});
