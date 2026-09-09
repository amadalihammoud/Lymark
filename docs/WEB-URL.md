# Hospedagem web em um só domínio (`lymark.app`)

## Arquitetura

| URL | O que é |
| --- | --- |
| `https://lymark.app` | Landing Next.js (`site/`) — marketing, termos, conta |
| `https://lymark.app/entrar` | Login Clerk (site) → após sucesso redireciona para `/web` |
| `https://lymark.app/web` | App Expo (export estático) no **mesmo** domínio |
| `https://app.lymark.app` | Legado — redirecionar para `https://lymark.app/web` |

O desktop Electron **não** usa `/web`: o script `web:build` exporta com base na
raiz. Só o build hospedado define `LYMARK_WEB_BASE=/web` (via
`app.config.js` → `expo.experiments.baseUrl`).

```
npm run web:build          # desktop / local — sem LYMARK_WEB_BASE
npm run web:build:hosted   # Vercel — baseUrl=/web + copia para site/public/web/
```

O script `scripts/publish-web-to-site.js` substitui `site/public/web/` pelo
conteúdo de `dist/` (inclui **`canvaskit.wasm`** — obrigatório para o Skia).
Esse conteúdo **não** entra no git (`site/.gitignore`).

## Vercel (projeto `lymark`, Root Directory = `site`)

### Build Command

O Root Directory continua `site`, mas o export do Expo precisa rodar na raiz
do monorepo **antes** do `next build`:

```bash
cd .. && npm ci && npm run web:build:hosted && cd site && npm ci && next build
```

(Install Command do Next pode ficar vazio ou `npm ci` só em `site` se o
comando de build já instala os dois.)

### Variáveis de ambiente (Production)

No momento do **`expo export`** (`web:build:hosted`), a chave do Clerk precisa
estar disponível como `EXPO_PUBLIC_*` — o Metro **inlina** no bundle. Defina
no projeto Vercel:

| Nome | Valor |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | mesma chave publicável do Clerk (obrigatória no export) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | já usada pelo site Next |
| `CLERK_SECRET_KEY` | já usada pelo site Next |

Pode copiar o valor de `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` para
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (são a mesma chave publicável). Sem
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` no build hospedado, o AuthGate em produção
**bloqueia** o app (fail-closed).

Opcional: `EXPO_PUBLIC_ENTITLEMENTS_URL` (padrão já aponta para
`https://lymark.app/api/entitlements`).

### SPA em `/web`

`site/vercel.json` reescreve rotas do Expo Router (sem extensão de arquivo)
para `/web/index.html`, sem engolir `_expo/`, `assets/` nem `canvaskit.wasm`.
Arquivos estáticos em `public/web/` têm precedência no filesystem da Vercel.

### Redirect de `app.lymark.app`

No painel Vercel → Domains do projeto **`lymark`** (Root Directory = `site`;
**não** o projeto antigo `lymark-app`):

1. Adicione o domínio `app.lymark.app` (e, se existir, `www.app.lymark.app`)
   ao projeto **lymark**.
2. Não configure redirect no painel de Domains — o Next já trata isso.

O redirect **308** está em `site/next.config.mjs` (`redirects()` com
`has: [{ type: 'host', value }]`): qualquer path em `app.lymark.app` ou
`www.app.lymark.app` vai para `https://lymark.app/web`.

## Fluxo do usuário

1. Landing → “Abrir no navegador” → `/entrar`
2. Clerk autentica → `forceRedirectUrl=/web`
3. App Expo em `/web` (AuthGate + sessão Clerk no mesmo domínio)

Conta (`/conta`) → botão “Abrir o aplicativo” aponta para `/web`.

## Proxy / i18n

`site/proxy.ts` (middleware) ignora caminhos `/web` — sem prefixo de locale
do next-intl no SPA.
