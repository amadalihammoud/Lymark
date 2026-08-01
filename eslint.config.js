const expoConfig = require('eslint-config-expo/flat');

/**
 * Configuração do ESLint no formato flat.
 *
 * Parte da base do Expo e acrescenta o que este projeto trata como regra:
 * caminhos relativos profundos são proibidos — todo import entre pastas usa
 * o alias `@/`, que é o que mantém a estrutura em camadas legível.
 */
module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use o alias "@/" em vez de subir mais de um nível.',
            },
          ],
        },
      ],
    },
  },
];
