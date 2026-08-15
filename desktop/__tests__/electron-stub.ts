/**
 * O mínimo do Electron para os testes.
 *
 * O pacote `electron` publicado no npm não é o módulo em si: é um instalador
 * que exporta o caminho do binário. Fora do processo do Electron, `import {
 * app } from 'electron'` devolve `undefined` e qualquer leitura derruba a
 * suíte antes do primeiro teste.
 *
 * O `jest.config.js` aponta `^electron$` para cá.
 */

export const app = {
  /** Os testes rodam sempre a partir do repositório, nunca de um pacote. */
  isPackaged: false,
  getLocale: () => 'pt-BR',
};
