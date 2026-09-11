# Hospedagem web em um só domínio (`lymark.app`)

## Arquitetura

| URL | O que é |
| --- | --- |
| `https://lymark.app` | Landing Next.js (`site/`) — marketing, termos, conta |
| `https://lymark.app/entrar` | Login Clerk (site) → após sucesso redireciona para `/web` |
| `https://lymark.app/web` | **Versão web canônica** — studio Vite (`desktop/web`) no **mesmo** domínio |
| `https://lymark.app/mesa` | Alias legado — **308** para `/web` |
| `https://app.lymark.app` | Legado — redirecionar para `https://lymark.app/web` |

O desktop Electron **não** usa `/web` hospedado: o script `web:build` ainda
exporta o Expo com base na raiz para o shell Electron. A versão **no navegador**
é o studio Vite (`mesa:build:hosted` / `web:build:hosted`).

```
npm run web:build            # Expo → dist/ (Electron / local)
npm run web:build:hosted     # alias → mesa:build:hosted (Vercel → site/public/web/)
npm run mesa:build:hosted    # Vite studio com base /web/ → site/public/web/
npm run expo:web:build:hosted # legado: Expo com LYMARK_WEB_BASE=/web (não usar na Vercel)
```

O script `scripts/publish-mesa-to-site.js` substitui `site/public/web/` pelo
build do Vite. Esse conteúdo **não** entra no git (`site/.gitignore`).

## Vercel (projeto `lymark`, Root Directory = `site`)

### Build Command

O Root Directory continua `site`, mas o studio precisa rodar na raiz do
monorepo **antes** do `next build`:

```bash
cd .. && npm ci && npm run web:build:hosted && cd site && npm ci && next build
```

(`web:build:hosted` hoje é alias de `mesa:build:hosted`.)

### Variáveis de ambiente (Production)

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | chave publicável do Clerk (site + `/api/public-config` para o SPA) |
| `CLERK_SECRET_KEY` | já usada pelo site Next |

O SPA em `/web` lê a chave via `/api/public-config` (ou `VITE_CLERK_PUBLISHABLE_KEY` no build do Vite, se definida).

### SPA em `/web`

`site/vercel.json` reescreve rotas sem extensão de arquivo para
`/web/index.html`, sem engolir `assets/`. Arquivos estáticos em `public/web/`
têm precedência no filesystem da Vercel.

### Redirect de `app.lymark.app` e `/mesa`

O redirect **308** está em `site/next.config.mjs` (`redirects()`):

- qualquer path em `app.lymark.app` / `www.app.lymark.app` → `https://lymark.app/web`
- `/mesa` e `/mesa/*` → `/web` e `/web/*`

## Fluxo do usuário

1. Landing → “Abrir no navegador” → `/web` (ou `/entrar` no hero)
2. Sem sessão, o SPA manda para `/entrar?next=/web`
3. Clerk autentica → `forceRedirectUrl=/web`
4. Studio Vite em `/web`

Conta (`/conta`) → botão “Abrir o aplicativo” aponta para `/web`.

## Proxy / i18n

`site/proxy.ts` (middleware) ignora caminhos `/web` (e `/mesa` legado) — sem
prefixo de locale do next-intl no SPA.
