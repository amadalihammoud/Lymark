# Lymark — versão web de notebook e PC

Esta é a versão web que abre no **navegador em computador** e, em seguida, no
Electron (`desktop/`). Foto no centro, carimbo à direita, uma linha de chrome.

Não substitui o app de celular em `src/` nem o site em `site/`.

```
cd desktop/web
npm install
npm run dev
```

Abre em `http://localhost:5173`. Arraste uma foto ou use Abrir foto.

Produção: **https://lymark.app/web** (gerado por `npm run web:build:hosted`).

```
npm run build     # dist/ — o Electron pode servir isso no lugar do Expo web
npm run typecheck
npm run test
```

O selo criptográfico e a cota são da conta. Sem sessão a versão web redireciona
para `/entrar?next=/web`. Depois do login volta para cá.
