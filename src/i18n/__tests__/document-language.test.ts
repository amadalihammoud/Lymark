import { applyDocumentLanguage, type DocumentRoot } from '../document-language';

import { LOCALES } from '@i18n/locales';

/**
 * O que está sendo verificado é o que o leitor de tela lê.
 *
 * Um `lang` errado não deixa rastro na tela: a interface parece perfeita e a
 * voz sai com os fonemas da língua errada. Só quem usa leitor de tela percebe,
 * e é justamente quem não tem como contornar.
 */

const documento = (): DocumentRoot & { documentElement: { lang: string; dir: string } } => ({
  documentElement: { lang: 'pt', dir: 'ltr' },
});

describe('applyDocumentLanguage', () => {
  it('escreve o idioma escolhido', () => {
    const doc = documento();

    applyDocumentLanguage(doc, 'ru');

    expect(doc.documentElement.lang).toBe('ru');
  });

  it('vira o árabe para a direita', () => {
    const doc = documento();

    applyDocumentLanguage(doc, 'ar');

    expect(doc.documentElement.lang).toBe('ar');
    expect(doc.documentElement.dir).toBe('rtl');
  });

  it('desfaz o rtl ao voltar para um idioma da esquerda para a direita', () => {
    // O caso que um `if (isRtl) set` esqueceria: quem experimenta o árabe e
    // volta para o português ficaria com o documento espelhado.
    const doc = documento();

    applyDocumentLanguage(doc, 'ar');
    applyDocumentLanguage(doc, 'pt');

    expect(doc.documentElement.dir).toBe('ltr');
  });

  it.each(LOCALES)('%s sai com direção declarada', (locale) => {
    const doc = documento();

    applyDocumentLanguage(doc, locale);

    expect(doc.documentElement.lang).toBe(locale);
    expect(['ltr', 'rtl']).toContain(doc.documentElement.dir);
  });

  it.each([
    ['sem documento', undefined],
    ['documento nulo', null],
    ['documento sem elemento raiz', {}],
    ['elemento raiz nulo', { documentElement: null }],
  ])('%s não lança — é o Android e o iOS', (_nome, doc) => {
    expect(() => applyDocumentLanguage(doc as DocumentRoot | null, 'pt')).not.toThrow();
  });
});
