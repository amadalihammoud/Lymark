# Identidade, pagamento e direito de acesso

A arquitetura de contas e assinatura do Lymark, decidida antes de existir
código. Este documento é a especificação da Fase 2.

---

## 1. A distinção que sustenta tudo

Três coisas que costumam ser confundidas, e que aqui são camadas separadas:

| Camada | Pergunta que responde | Quem resolve |
|---|---|---|
| **Identidade** | Quem é esta pessoa? | Clerk |
| **Pagamento** | Por onde o dinheiro entrou? | App Store, Play, Stripe |
| **Direito de acesso** | Esta pessoa tem acesso pago agora? | **O nosso backend** |

O erro clássico é perguntar ao Stripe se a pessoa tem assinatura. O Stripe não
sabe da Play Store. Só a **nossa** tabela sabe de todas as fontes.

O fluxo é o mesmo venha o cliente de onde vier:

```
login (Clerk) → user_id → GET /api/entitlements → { plano, cota, usadas, valido_ate }
```

O cliente **nunca** consulta Stripe, Apple ou Google para *verificar*. Só para
*comprar*.

---

## 2. O que isso exige

Um backend. O Lymark hoje não tem — e a landing page promete *"sem conta, sem
servidor"*. **Essa promessa morre nesta fase**, e o texto precisa mudar junto,
em doze idiomas, no site e no aplicativo. Ver a seção 7.

Com contas e fotos com GPS, entramos em território de LGPD e RGPD de verdade:
política de privacidade real, exclusão de conta, base legal declarada.

---

## 3. O cenário que decide o desenho

> A pessoa assina pela Play Store no Android. Depois abre o desktop e espera
> que a assinatura valha lá também.

Isso funciona porque:

- **Apple** permite honrar assinatura comprada fora — diretriz 3.1.3(b),
  *Multiplatform Services*. O que é restrito é **vender** dentro do app iOS.
- **Google Play** segue a mesma lógica.
- **Microsoft Store** é irrelevante hoje: o desktop sai por `nsis`,
  `portable`, `AppImage` e `deb`, direto do site. Sem loja, sem regra de loja.

Consequência prática: dentro do app iOS/Android a compra passa pela loja; na
web e no desktop, Stripe. **Todos escrevem na nossa tabela.**

> As regras de link externo mudaram nos EUA em 2025–2026 e continuam mudando.
> Conferir as diretrizes vigentes antes de implementar a compra, não depois.

---

## 4. Freemium com cota — e o problema que ele cria

O plano grátis é ~15 fotos por mês. Isso muda o entitlement de booleano para
estado:

```json
{ "plano": "free", "cota": 15, "usadas": 4, "periodo_ate": "2026-09-01" }
```

A parte fácil é essa. A difícil é específica do Lymark:

**O app é usado em telhado, em galpão, em obra — sem sinal.** Se a captura
precisar perguntar ao servidor "posso?", o produto quebra exatamente no
momento em que importa.

### Crédito emprestado

- Ao logar ou sincronizar, o servidor concede um lote válido até uma data.
- O app decrementa **localmente** e **nunca bloqueia por falta de rede**.
- Quando volta o sinal, reconcilia.
- Se estourou a cota offline, **honramos as fotos** e ajustamos no ciclo
  seguinte. Perder duas fotos para um golpista é infinitamente mais barato que
  travar um cliente honesto no telhado.

### Três regras que decorrem disso

**O período é do servidor, não do relógio do aparelho.** Senão a pessoa muda a
data e ganha fotos infinitas.

**O login precisa sobreviver offline.** Sessão do Clerk expira; o app tem de
confiar no entitlement em cache por alguns dias sem rede. Isso não vem de
graça — é desenho deliberado.

**Definir o que conta como "uma foto".** Decisão de confiança, não de
engenharia: conta a **exportação carimbada**, e reexportar a mesma foto não
conta de novo. E "restam 11 de 15" fica sempre visível. Cota que o usuário não
consegue prever gera raiva e reembolso.

---

## 5. Os três relógios

Confundir os três é a fonte mais comum de bug nesta área.

| Relógio | Quem controla | Para quê |
|---|---|---|
| `valido_ate` no token | nosso servidor | até quando o app confia offline |
| tolerância offline | nós (no app) | quanto tempo aceita token vencido sem rede |
| grace period / retry | Apple, Google, Stripe | pagamento falhou, ainda tentando |

### A viagem de 15 dias — resolvida

Token assinado (JWT) no aparelho, com `valido_ate`. Assinatura válida até
30/09, pessoa offline de 05 a 20/09: o app olha o token, vê que a data não
chegou, funciona normal.

### A borda da renovação — o risco de verdade

Renovação em 30/09 e a pessoa offline de 25/09 a 10/10. No dia 01/10 o token
venceu e o app **não tem como saber** se a renovação passou.

Solução: **tolerância offline** de ~14 dias, com aviso discreto
(*"reconecte para confirmar sua assinatura"*).

**E quando a tolerância acaba, ela cai para o freemium — nunca para o
bloqueio.** Uma pessoa que paga e ficou sem sinal jamais pode abrir o app e
encontrar uma parede. Cair para 15 fotos/mês é constrangedor; ficar trancado
do lado de fora é motivo de reembolso e nota 1 na loja.

Um único momento com sinal resolve tudo: o token renova, o `valido_ate` anda
para frente, o relógio da tolerância zera.

### Armadilha do relógio

A tolerância offline depende do relógio do aparelho, e relógio se mexe.
Mitigação: guardar o último horário visto do servidor e **recusar andar para
trás**; e um teto absoluto de dias offline.

Isso não fecha 100%. E tudo bem — vai vazar pouquíssimo, e o custo de blindar
totalmente é punir usuário honesto sem sinal, que é o público inteiro.

---

## 6. O desenho

```
Clerk (quem é)
   ↓ user_id
Tabela de entitlements  ← webhooks ← RevenueCat ← StoreKit / Play Billing
   ↓                                ← Stripe (web + desktop, direto)
GET /api/entitlements → { plano, cota, usadas, valido_ate }
   ↓
App decrementa local, reconcilia com rede, nunca bloqueia offline
```

**RevenueCat** unifica App Store, Play Store e Stripe. Construir isso na mão
significa implementar a App Store Server API, a Play Developer API e webhooks
do Stripe, com renovações, reembolsos, grace period, upgrades e fraude — meses
de trabalho e a parte mais chata de manter.

Mas **a nossa tabela continua sendo a fonte da verdade**, alimentada por
webhook. Assim nunca ficamos reféns.

---

## 7. Ordem de implementação

1. **Backend e banco.** Tabela de entitlements, `GET /api/entitlements`.
2. **Clerk** no site → no Expo → no Electron (deep link; o mais chato).
3. **Stripe** para web e desktop. É onde não há regra de loja, então o dinheiro
   roda ponta a ponta mais rápido.
4. **Faixa de teste fechada** na loja. O app segue invisível ao mundo, e
   descobrimos cedo se a Apple implica com o fluxo de assinatura — a
   informação mais cara do projeto, pelo preço mais baixo.
5. **RevenueCat + Play**, depois **App Store**.
6. **Cota e freemium**: token assinado, lote de créditos, tolerância offline,
   contador visível.
7. **Pré-lançamento**: LGPD, exclusão de conta, listagens das lojas.

---

## 7.1 As promessas que precisam cair junto

Quatro chaves do catálogo afirmam hoje que o Lymark não tem servidor e não
cria conta. **São verdade agora** — e por isso não podem ser alteradas antes
da hora: trocá-las hoje criaria a mentira oposta, prometendo conta antes de
existir conta.

Elas mudam **no mesmo commit que liga a autenticação**, nunca antes e nunca
depois:

| Chave | O que afirma |
|---|---|
| `site.hero.meta.noAccount` | "Sem conta" |
| `site.hero.meta.noServer` | "Sem servidor" |
| `site.data.device.description` | "não tem servidor, não cria conta e não envia as suas fotos" |
| `app.about.privacyOnDevice` | "não possui servidor, não cria conta e não envia as suas fotos" |

São **48 lugares** — quatro chaves em doze idiomas. A Fase 1 multiplicou o
problema por doze, o que torna a lista acima mais útil do que a memória de
quem escreveu.

Duas afirmações vizinhas **continuam verdadeiras** depois da Fase 2, e não
devem ser tocadas por engano: `app.about.privacyGeocoding` e
`app.about.privacyLocation` falam da coordenada enviada ao serviço de mapas
pelo sistema operacional — isso não muda por existir conta.

---

## 8. Decisões ainda em aberto

- **Login obrigatório para tudo, ou só para o que é pago?** A decisão atual é
  obrigatório, com o freemium servindo de trial. Vale reavaliar: o app é usado
  em campo, e uma parede de login antes da primeira foto é atrito num momento
  ruim.
- **Onde o backend roda.** Existem dois projetos na Vercel: `lymark`
  (o site) e `lymark-app` (o build web do Expo). As rotas de API cabem no
  primeiro, mas isso precisa ser decidido, não assumido.
- **O que exatamente conta como foto**, na borda: reexportação com campos
  diferentes conta como nova?
