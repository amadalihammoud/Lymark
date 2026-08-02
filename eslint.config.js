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
    // `site/` é o site institucional: projeto Next, com toolchain, tsconfig e
    // dependências próprios. Analisá-lo com a configuração do app só produz
    // erros de módulo não resolvido.
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'site/*'],
  },
  {
    // `scripts/` roda no Node, fora do aplicativo: são ferramentas de
    // calibragem, e não código que vai para o aparelho.
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
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
