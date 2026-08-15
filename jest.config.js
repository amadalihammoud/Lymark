/**
 * Os testes cobrem a camada pura do app — formatação, geração de código,
 * montagem do carimbo e geometria. São justamente as regras que decidem o
 * que sai impresso na foto, e rodam sem simulador nem aparelho.
 */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',

  /**
   * O `use-intl` e a família `@formatjs`, que ele usa por baixo, são
   * publicados só em ESM — e o Jest não transforma nada dentro de
   * `node_modules` por padrão. Sem esta exceção, qualquer arquivo que importe
   * o motor de tradução quebra na análise, inclusive o teste de paridade
   * entre as versões nativa e web dos hooks, que nem chega a rodar.
   *
   * A lista do `jest-expo` é preservada; só acrescentamos os pacotes.
   */
  transformIgnorePatterns: [
    expoPreset.transformIgnorePatterns[0].replace(
      '(?!(',
      '(?!(use-intl|@formatjs|intl-messageformat|',
    ),
    ...expoPreset.transformIgnorePatterns.slice(1),
  ],
  moduleNameMapper: {
    // A ordem importa: o alias de assets é mais específico e precisa vir antes.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    // O catálogo de traduções fica na raiz, fora de `src/`, e é compartilhado
    // com o site e o desktop.
    '^@i18n/(.*)$': '<rootDir>/i18n/$1',
    // `electron` no npm é o instalador do binário, não o módulo. Sem este
    // desvio, qualquer teste do processo principal quebra ao importá-lo.
    '^electron$': '<rootDir>/desktop/__tests__/electron-stub.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
};
