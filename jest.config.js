/**
 * Os testes cobrem a camada pura do app — formatação, geração de código,
 * montagem do carimbo e geometria. São justamente as regras que decidem o
 * que sai impresso na foto, e rodam sem simulador nem aparelho.
 */
module.exports = {
  preset: 'jest-expo',
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
