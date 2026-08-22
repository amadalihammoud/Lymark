const { getDefaultConfig } = require('expo/metro-config');

/**
 * Configuração padrão do Expo, com um único desvio: os módulos de Node que o
 * caminho de EXIF menciona — e nunca executa no aplicativo — viram módulo
 * vazio no bundle NATIVO.
 *
 * Dois lugares os mencionam. `src/lib/exif.ts` tem um ramo que lê arquivo do
 * disco, alcançável só em Node (testes e scripts; no aplicativo quem chama
 * passa bytes ou `File`, nunca um caminho — no celular o leitor nem é
 * chamado). E o próprio `exifreader` embute `require` de `fs`, `http`,
 * `https` e `@xmldom/xmldom`, todos guardados por checagens de runtime que
 * nunca são verdadeiras fora de Node.
 *
 * O Metro, porém, resolve todo import ESTATICAMENTE: no primeiro build
 * Android do EAS ele exigiu que esses módulos existissem mesmo em ramos que
 * nunca rodam ali, e o build inteiro caiu. Na web o Expo já entrega módulo
 * vazio para os builtins de Node — é por isso que o export web sempre
 * passou; aqui fazemos o mesmo para Android e iOS. Em Node (Jest, scripts),
 * que não passa pelo Metro, tudo segue lendo do disco como sempre leu.
 */
const NODE_ONLY_MODULES = new Set(['fs', 'http', 'https', '@xmldom/xmldom']);

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && NODE_ONLY_MODULES.has(moduleName)) {
    return { type: 'empty' };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
