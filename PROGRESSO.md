# Progresso — Lymark

**Branch de trabalho:** claude/ultimas-sessoes-app-xj0ydu
**Última atualização:** 16/08/2026

---

## Onde o projeto está

A `main` do GitHub foi promovida a partir de `recuperacao/base-limpa` e hoje
contém todo o trabalho das últimas sessões. A `main` antiga (quebrada) está
arquivada na tag `arquivo/main-quebrada-2026-08-16`.

Verificação feita em 16/08/2026 sobre esse estado:

- `npm run typecheck` — limpo
- `npm run lint` — 0 erros (27 avisos)
- `npm test` — 588 testes passando, 31 suítes
- `site`: `npm run build` — sucesso, incluindo a rota `/api/entitlements`

---

## Concluído (resumo por bloco)

### Porte Web e Desktop (Fases 4–8 do plano original)
Batch processing, CI/CD, deploy, módulos nativos isolados, segurança do
Electron. Detalhes no histórico deste arquivo (git log de 10/08/2026).

### i18n — 12 idiomas
- Catálogo único de traduções para mobile, desktop e site
  (`i18n/messages/`), zero texto fixo no aplicativo.
- Carimbo em 12 idiomas: endereço na ordem de cada país, data do EXIF no
  idioma certo, fontes para cirílico/CJK/árabe (RTL completo).
- Documentos legais (Política de Privacidade e Termos) em 12 idiomas, com
  hreflang, sitemap e canônico no site.

### Marca
- Manual de Marca aplicado ao app, ao site e ao carimbo (logotipo da
  empresa, cores livres, faixa).
- Landing nova em 12 idiomas, ligada ao app web.

### Fase 2 — Identidade, pagamento e direito de acesso
Especificação em `docs/ASSINATURA.md`. Ordem de implementação na seção 7.

- [x] **Passo 1** — `GET /api/entitlements`: cota vitalícia por conta em
  `privateMetadata` do Clerk, sem banco. Cliente da API, regra de acesso pura
  e testada, cota ligada ao fluxo de exportação, contador visível.
- [x] **Passo 2 (site)** — Clerk no site; as promessas de "sem conta" caíram
  junto (144 lugares nos catálogos e documentos legais — ver §7.1). Sem chave
  do Clerk configurada, a landing continua no ar.
- [x] **Passo 2 (Expo)** — Clerk no aplicativo: tela de conta com login por
  código de e-mail (entrar e cadastrar no mesmo fluxo, nos 12 idiomas), e a
  ponte que sincroniza o entitlement com o token da sessão — no login e ao
  voltar ao primeiro plano, subindo o `spentOffline`. Sem
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, o app segue inteiro sem conta.
- [x] **Passo 2 (Electron)** — login via deep link: o desktop abre
  `/conta/desktop` no navegador (onde o Clerk funciona inteiro), o site
  emite um token próprio de 90 dias (HMAC, `site/lib/desktop-token.ts`) e o
  deep link `lymark://login#token=…` o devolve ao Electron. A API aceita os
  dois tokens pelo mesmo `verify`. Exige `DESKTOP_TOKEN_SECRET` na Vercel.
- [x] **Passo 3** — Stripe para web e desktop: `GET /api/checkout` (botão
  "Assinar" na conta vira um link; 303 para o Stripe) e
  `POST /api/stripe-webhook` (verificação HMAC própria, consulta a
  assinatura na API e grava `paidUntil` com 3 dias de folga da renovação).
  Sem SDK. Exige `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e
  `STRIPE_PRICE_ID` na Vercel; sem elas, a conta volta ao aviso de
  "assinatura em breve".
- [ ] **Passo 4** — faixa de teste fechada na loja (Apple).
- [ ] **Passo 5** — RevenueCat + Play, depois App Store.
- [ ] **Passo 6** — cota e freemium completos: token assinado, lote de
  créditos, tolerância offline.
- [~] **Passo 7 (parcial)** — portão de login: a conta é obrigatória desde a
  primeira abertura (o app web abria sem conta; agora, com a chave do Clerk
  no build, o login vem antes das telas). Exclusão de conta acionável: URL
  pública `/conta/excluir` (aviso do §8.5, POST sem JavaScript, apaga o
  usuário no Clerk) e o caminho de dentro do app nas três plataformas.
  Restam do passo 7: política de retenção escrita, revisão jurídica do §8 e
  listagens das lojas.

---

## O que depende do usuário (não é código)

- Chaves do Clerk no ambiente do site (Vercel):
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`.
- `DESKTOP_TOKEN_SECRET` no site (Vercel): uma string longa e aleatória —
  é o que assina o token de login do desktop.
- Stripe (Vercel): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (do
  endpoint `https://lymark.app/api/stripe-webhook`, eventos
  `checkout.session.completed` e `invoice.paid`) e `STRIPE_PRICE_ID`
  (preço recorrente criado no painel).
- A mesma chave publicável no build do app:
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (e, se o endpoint não for o de
  produção, `EXPO_PUBLIC_ENTITLEMENTS_URL`).
- Secrets de deploy no GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`.
- DNS do domínio lymark.app.
- Decisões em aberto de `docs/ASSINATURA.md` §9 e revisão jurídica de §8
  (LGPD/RGPD) antes de publicar contas.

---

## Vídeo carimbado (fase própria — desktop concluído)

- [x] **Desktop** — tela `/video`: escolhe o arquivo, o ffmpeg (empacotado
  via `ffmpeg-static`, por `extraResources`) sonda dimensões e duração, o
  carimbo é desenhado pelo MESMO código da foto num PNG transparente do
  tamanho do quadro (`render-overlay.ts`) e o ffmpeg o sobrepõe quadro a
  quadro, com progresso na tela. Data/hora/dia preenchidos da data do
  arquivo (o análogo do EXIF do lote), editáveis. Um vídeo consome uma
  unidade da cota, como uma foto. Carimbo estático por decisão: o registro
  é do momento da captura.
- [ ] **Web** — clipes curtos (WebCodecs, com aviso para usar o desktop em
  vídeos longos).
- [ ] **Celular** — gravar já com o carimbo (VisionCamera + Skia frame
  processor), fase própria.

## Próximo passo de código

Passo 4 em diante: faixa de teste fechada nas lojas, RevenueCat + Play e
App Store — e o refinamento do freemium (token assinado, tolerância
offline já existem; falta o fluxo de compra dentro do app móvel).
