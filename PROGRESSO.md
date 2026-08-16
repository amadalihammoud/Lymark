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
- [ ] **Passo 2 (Expo)** — Clerk no aplicativo mobile.
- [ ] **Passo 2 (Electron)** — Clerk no desktop via deep link (o mais chato).
- [ ] **Passo 3** — Stripe para web e desktop.
- [ ] **Passo 4** — faixa de teste fechada na loja (Apple).
- [ ] **Passo 5** — RevenueCat + Play, depois App Store.
- [ ] **Passo 6** — cota e freemium completos: token assinado, lote de
  créditos, tolerância offline.
- [ ] **Passo 7** — pré-lançamento: LGPD (§8), exclusão de conta, listagens.

---

## O que depende do usuário (não é código)

- Chaves do Clerk no ambiente do site (Vercel):
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`.
- Secrets de deploy no GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`.
- DNS do domínio lymark.app.
- Decisões em aberto de `docs/ASSINATURA.md` §9 e revisão jurídica de §8
  (LGPD/RGPD) antes de publicar contas.

---

## Próximo passo de código

Clerk no aplicativo Expo (Passo 2 continua): login no mobile usando a mesma
conta do site, alimentando o cliente de entitlements já existente em
`src/`. Depois, o deep link do Electron.
