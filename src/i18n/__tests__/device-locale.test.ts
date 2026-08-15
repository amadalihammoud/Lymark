import { resolveDeviceLocale } from '../device-locale';

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
  intlLocale = 'is-IS',
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

  it('ignora a região: pt-PT e pt-AO recebem o catálogo português', () => {
    expect(withDeviceLanguages(['pt-PT'], resolveDeviceLocale)).toBe('pt');
    expect(withDeviceLanguages(['pt-AO'], resolveDeviceLocale)).toBe('pt');
  });

  it('ignora a escrita: zh-Hant recebe o catálogo chinês', () => {
    expect(withDeviceLanguages(['zh-Hant-TW'], resolveDeviceLocale)).toBe('zh');
  });

  it('aceita separador com sublinhado, que alguns aparelhos ainda usam', () => {
    expect(withDeviceLanguages(['es_MX'], resolveDeviceLocale)).toBe('es');
  });

  it('não distingue maiúsculas', () => {
    expect(withDeviceLanguages(['DE-AT'], resolveDeviceLocale)).toBe('de');
  });

  it('respeita a ordem de preferência da pessoa', () => {
    // Islandês não existe no catálogo; o francês é a segunda escolha dela e
    // deve vencer o português, que é apenas o padrão do app.
    expect(withDeviceLanguages(['is-IS', 'fr-CA', 'en'], resolveDeviceLocale)).toBe('fr');
  });

  it('cai no português quando nenhum idioma pedido existe', () => {
    expect(withDeviceLanguages(['is-IS', 'sw-KE'], resolveDeviceLocale)).toBe('pt');
  });

  it('usa o Intl quando o navegador não expõe a lista', () => {
    expect(withDeviceLanguages(undefined, resolveDeviceLocale, 'ko-KR')).toBe('ko');
  });

  it('cai no português quando nenhuma das duas fontes serve', () => {
    expect(withDeviceLanguages(undefined, resolveDeviceLocale, 'is-IS')).toBe('pt');
  });
});
