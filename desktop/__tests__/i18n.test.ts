import { availableLocales, translate } from '../i18n';

/**
 * O processo principal lê o catálogo do disco, e não por `import`. Isso o
 * deixa sujeito a coisas que a checagem de tipos não pega: arquivo ausente,
 * chave escrita errada, idioma que não existe. Estes testes cobrem
 * exatamente essa faixa.
 */

describe('translate', () => {
  it('traduz o menu no idioma pedido', () => {
    expect(translate('de', 'desktop.menu.file')).toBe('Datei');
    expect(translate('ja', 'desktop.menu.quit')).toBe('終了');
  });

  it('usa o termo do sistema operacional, e não a tradução literal', () => {
    // "Edit" em russo é "Правка" no menu de qualquer programa do Windows.
    // "Редактировать" é a tradução correta do verbo e a palavra errada aqui.
    expect(translate('ru', 'desktop.menu.edit')).toBe('Правка');
    expect(translate('fr', 'desktop.menu.edit')).toBe('Édition');
  });

  it('alcança chaves de outros namespaces do mesmo catálogo', () => {
    expect(translate('ko', 'app.about.title')).toBeTruthy();
    expect(translate('es', 'desktop.dialog.pickFolder')).toBe('Seleccionar carpeta de salida');
  });

  it('cai no português quando o idioma não existe', () => {
    // O aviso no console é o comportamento esperado — silenciado aqui só
    // para o rastro de erro do Node não poluir a saída da suíte.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(translate('tlh', 'desktop.menu.file')).toBe('Arquivo');
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('devolve a própria chave quando ela não existe em nenhum catálogo', () => {
    // Feio de propósito: um menu com a chave à mostra denuncia o problema na
    // primeira execução, ao contrário de um menu vazio.
    expect(translate('pt', 'desktop.menu.naoExiste')).toBe('desktop.menu.naoExiste');
  });

  it('não confunde um nó intermediário com um texto', () => {
    expect(translate('pt', 'desktop.menu')).toBe('desktop.menu');
  });
});

describe('availableLocales', () => {
  it('deduz os idiomas dos próprios arquivos do catálogo', () => {
    const locales = availableLocales();

    expect(locales).toContain('pt');
    expect(locales).toContain('ar');
    expect(locales).toHaveLength(12);
  });
});
