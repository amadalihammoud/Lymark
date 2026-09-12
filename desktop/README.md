# Lymark Desktop

Dois pedaços:

- **`web/`** — versão web de notebook e PC (navegador). Foto no centro, carimbo à direita.
- **Este diretório** — shell Electron + ffmpeg (MP4, lote pesado, PDF).

A versão web está em [`web/`](./web/README.md):

```bash
cd desktop/web
npm install
npm run dev
```

O Electron é uma casca fina sobre o studio hospedado: o `BrowserWindow` abre
https://lymark.app/web e o preload expõe `window.lymark` só nessa origem — é
por essa ponte que o studio recebe o ffmpeg (vídeo inteiro), a pasta de saída
e o menu (`web/src/lib/desktop.ts`). Nenhum build web vai no pacote.

Para desenvolver os dois juntos:

```bash
cd desktop/web && npm run dev            # Vite em http://localhost:5173
cd desktop && LYMARK_STUDIO_URL=http://localhost:5173 npm run start
```

Sem rede, a janela mostra uma página de "sem conexão" com tentar de novo.
