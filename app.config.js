/**
 * Config dinâmica do Expo — lê `app.json` como fonte de verdade e só
 * sobrepõe o que precisa ser decidido em tempo de build.
 *
 * `experiments.baseUrl` só entra no export hospedado em lymark.app/web
 * (`LYMARK_WEB_BASE=/web`). Desktop e `web:build` local ficam sem baseUrl
 * (raiz), para o Electron continuar servindo em `/`.
 */
const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const baseUrl = process.env.LYMARK_WEB_BASE || undefined;

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      experiments: {
        ...appJson.expo.experiments,
        ...(baseUrl ? { baseUrl } : {}),
      },
    },
  };
};
