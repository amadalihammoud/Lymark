# Lymark Desktop

Dois pedaços:

- **`web/`** — mesa de notebook e PC (navegador). Foto no centro, carimbo à direita.
- **Este diretório** — shell Electron + ffmpeg (MP4, lote pesado, PDF).

A mesa nova está em [`web/`](./web/README.md):

```bash
cd desktop/web
npm install
npm run dev
```

O Electron ainda serve o build Expo web. Próximo passo: apontar o `BrowserWindow`
para `desktop/web/dist` depois de `npm run build` em `web/`.
