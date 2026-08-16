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
sabe da Play Store. Só a **nossa** fonte da verdade sabe de todas.

O fluxo é o mesmo venha o cliente de onde vier:

```
login (Clerk) → user_id → GET /api/entitlements → { plano, cota, usadas, valido_ate }
```

O cliente **nunca** consulta Stripe, Apple ou Google para *verificar*. Só para
*comprar*.

---

## 2. O que isso exige

Uma API. Não necessariamente um banco — ver 6.1, onde a decisão é começar sem
um.

E a landing page promete *"sem conta, sem servidor"*. **Essa promessa morre
nesta fase**, e o texto precisa mudar junto, em doze idiomas, no site e no
aplicativo. As quatro chaves estão enumeradas em 7.1.

Com contas, o Lymark entra em território de LGPD e RGPD de verdade: política
de privacidade com efeito jurídico, exclusão de conta acionável, base legal
declarada, contratos com operadores. A seção 8 é o mapa inteiro.

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
web e no desktop, Stripe. **Todos escrevem na nossa fonte da verdade.**

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
Entitlement (Clerk metadata)  ← webhooks ← RevenueCat ← StoreKit / Play
   ↓                                    ← Stripe (web + desktop, direto)
GET /api/entitlements → { plano, cota, usadas, valido_ate }
   ↓
App decrementa local, reconcilia com rede, nunca bloqueia offline
```

**RevenueCat** unifica App Store, Play Store e Stripe. Construir isso na mão
significa implementar a App Store Server API, a Play Developer API e webhooks
do Stripe, com renovações, reembolsos, grace period, upgrades e fraude — meses
de trabalho e a parte mais chata de manter.

Mas **a fonte da verdade continua sendo nossa**, alimentada por webhook. Assim
nunca ficamos reféns.

### 6.1 Onde a fonte da verdade mora — v1 sem banco

"Nossa" não quer dizer "num banco de dados nosso". Para a primeira versão, o
entitlement cabe em `privateMetadata` do usuário no Clerk.

| | `privateMetadata` do Clerk | Banco próprio |
|---|---|---|
| Infraestrutura nova | nenhuma | mais um serviço |
| Transação | não tem | tem |
| Consultas agregadas | não dá | dá |
| Limite de escrita | existe, e a escala esbarra nele | não |
| Acoplamento | preso ao Clerk | livre |
| **Lugares guardando dado pessoal** | **um a menos** | mais um |

O ponto fraco real é a falta de transação: dois aparelhos sincronizando ao
mesmo tempo podem perder uma contagem. Essa perda é **a favor do usuário** —
ele ganha uma foto, não perde. Numa cota de quinze por mês, é aceitável.

**Decisão: começar sem banco.** O formato da tabela descrito neste documento
continua valendo; muda só onde ele mora. A migração para banco acontece quando
a contabilidade ou as consultas exigirem — e o contrato de `GET
/api/entitlements` não muda, porque o cliente nunca soube onde o dado estava.

O que **não** fazemos é usar o RevenueCat como fonte da verdade. Isso deixaria
um fornecedor respondendo a pergunta mais importante do negócio.

---

## 7. Ordem de implementação

1. **A API.** `GET /api/entitlements`, com o entitlement em `privateMetadata`
   do Clerk — sem banco, conforme 6.1.
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

### 7.1.1 E os documentos legais, que dizem o mesmo com mais consequência

A lista acima cobre o catálogo de interface. Os mesmos fatos estão afirmados na
Política de Privacidade e nos Termos de Uso, que desde a tradução existem em
doze idiomas em `i18n/messages/legal/` — e ali a afirmação falsa não é um texto
de tela desatualizado, é um documento operante mentindo sobre o tratamento.

São **oito chaves × doze idiomas = 96 lugares**, que somados aos 48 acima dão
**144 lugares** no mesmo commit:

| Chave | Por que cai na Fase 2 |
|---|---|
| `privacy.meta.description` | afirma que não há servidor nem conta |
| `privacy.s01.p1` | idem, com mais palavras |
| `privacy.s07.p3` | "Não há tratamento fundado em legítimo interesse" — passa a haver, por §8.4 |
| `privacy.s08.p1` | "não realiza transferência internacional" — Clerk e Stripe estão fora do Brasil |
| `privacy.s09.p1` | "não há operador (*processor*) contratado" — passam a haver dois |
| `privacy.s10.p3` | "não existe repositório central passível de vazamento" |
| `privacy.s12.p2` | "O desenvolvedor não consegue acessar nem apagar esses dados" |
| `terms.s07.p1` | "Não há conta a cancelar nem assinatura a rescindir" |

O que **não** deve ser tocado, pelo mesmo cuidado do parágrafo anterior:
`privacy.s04.p1` diz que fotos, localização, histórico e preferências não são
enviados ao desenvolvedor. Continua verdadeiro — é a restrição de arquitetura do
§8.3, e ela não muda por existir conta.

A análise completa, com o que a tradução implica juridicamente, está em
`docs/DOCUMENTOS-LEGAIS.md`.

---

## 8. Proteção de dados — LGPD e RGPD

Esta seção é o mapa de conformidade da Fase 2. Está escrita para ser levada a
um advogado, não para substituí-lo: os pontos abaixo são o que precisa ser
decidido e documentado, com a posição recomendada de cada um.

### 8.1 A mudança de categoria

Hoje o Lymark quase não trata dado pessoal — é um aplicativo local. Ao criar
contas, **o Lymark passa a ser controlador** (LGPD art. 5º, VI; RGPD art. 4,
7): determina as finalidades e os meios do tratamento. Isso liga um conjunto
de obrigações que hoje simplesmente não existe.

Não é motivo para recuar. É motivo para entrar com o desenho certo.

### 8.2 Inventário — o que passa a existir

| Dado | Origem | Onde fica |
|---|---|---|
| E-mail | cadastro | Clerk |
| Identificador de usuário | Clerk | Clerk + tokens no aparelho |
| Plano, cota, contador | nosso | `privateMetadata` do Clerk |
| Status de assinatura | lojas / Stripe | RevenueCat + Clerk |
| Metadados de pagamento (país, 4 últimos dígitos) | Stripe / lojas | Stripe / lojas |
| Endereço IP | requisições | logs do servidor |

O identificador de usuário é pseudônimo, **mas continua sendo dado pessoal**,
porque é vinculável a uma pessoa identificada (LGPD art. 5º, I; RGPD
considerando 26). Pseudonimização reduz risco; não tira do escopo.

Endereço IP em log é dado pessoal no RGPD — isso é pacífico. Consequência
prática: **definir retenção de log**, e não deixá-lo crescer para sempre.

O contador de exportações é dado de uso ligado a uma identidade. É pouco, mas
não existia antes, e precisa aparecer na política.

### 8.3 O que continua fora do escopo — e vira regra

**Foto nunca sai do aparelho. Coordenada nunca sai do aparelho.**

Fotos de campo contêm pessoas, placas, documentos, rostos, interiores de
imóveis. Se trafegassem pelo nosso servidor, o Lymark saltaria de categoria:
dado possivelmente sensível, impacto de incidente muito maior, e provável
necessidade de relatório de impacto (LGPD art. 38).

Geolocalização recebe tratamento reforçado em ambos os regimes. Mantê-la fora
do servidor é o que mantém o custo de conformidade pequeno.

Isto é **restrição de arquitetura, não preferência**. Qualquer proposta futura
de "sincronizar o histórico na nuvem" reabre esta seção inteira e precisa ser
avaliada com ela na mão.

### 8.4 Base legal por finalidade

| Finalidade | Base legal | Artigo |
|---|---|---|
| Manter conta e prestar o serviço pago | execução de contrato | LGPD 7º, V; RGPD 6(1)(b) |
| Cobrar e processar pagamento | execução de contrato | idem |
| Guardar registro fiscal da transação | cumprimento de obrigação legal | LGPD 7º, II; RGPD 6(1)(c) |
| Segurança e prevenção a fraude | legítimo interesse | LGPD 7º, IX; RGPD 6(1)(f) |

**Não usar consentimento para a assinatura.** Consentimento é revogável a
qualquer momento (LGPD art. 8º, §5º), e uma revogação deixaria o Lymark sem
base legal para manter uma assinatura que a pessoa está pagando. Execução de
contrato é a base correta e não exige caixa de marcar.

Se um dia houver comunicação de marketing, **essa** sim precisa de base
própria — e aí consentimento é o caminho, separado do cadastro.

### 8.5 Retenção — onde mora a dificuldade

"Apagar minha conta" **não** significa apagar tudo, e prometer isso seria
promessa que não se cumpre.

| Dado | Ao excluir a conta |
|---|---|
| E-mail e identificador | exclusão imediata |
| Plano, cota, contador | exclusão imediata |
| Registro de transação | **retido por obrigação fiscal**, desvinculado do cadastro |
| Logs com IP | expiram pelo prazo próprio de log |

O prazo de retenção fiscal é o ponto que **precisa de confirmação
profissional** — varia com o regime tributário e com o país de quem comprou.
No Brasil costuma-se trabalhar com cinco anos; é o número a validar, não a
assumir.

O que precisa existir antes de publicar: **uma política de retenção escrita**,
dizendo de cada item o que sai na hora, o que é anonimizado e o que fica por
obrigação legal — com o prazo de cada um. Sem esse documento, não há como
responder a um pedido de exclusão de forma defensável.

### 8.6 Direitos do titular

LGPD art. 18; RGPD arts. 15 a 22. Os que exigem construção:

- **Acesso e portabilidade** — exportar o que existe do usuário em formato
  legível. Com o inventário acima, é uma resposta pequena.
- **Correção** — o Clerk já cobre e-mail e nome.
- **Exclusão** — conforme 8.5. Precisa ser acionável **dentro do aplicativo**,
  não só por e-mail: as lojas exigem caminho de exclusão de conta a partir do
  app e a partir de uma URL pública.
- **Revisão de decisão automatizada** (LGPD art. 20) — não se aplica: nada
  aqui decide sobre a pessoa por perfilamento.

Prazo de resposta: a LGPD trabalha com quinze dias para o pedido de acesso
simplificado (art. 19, I). O RGPD, um mês (art. 12(3)).

### 8.7 Operadores e transferência internacional

Cada fornecedor abaixo é operador, e cada um precisa de contrato de tratamento
(DPA) assinado — todos publicam o seu:

Clerk · Stripe · RevenueCat · Vercel

Praticamente todos processam nos Estados Unidos. Isso é **transferência
internacional**: LGPD art. 33; RGPD capítulo V.

- **RGPD**: o mecanismo usual é a adequação via *EU-US Data Privacy
  Framework*, verificando se o fornecedor está certificado, mais cláusulas
  contratuais padrão como camada de reserva. O DPF sobreviveu a questionamento
  judicial e segue válido, mas está sob pressão — o EDPB pediu revisão. **Não
  construir assumindo que ele é permanente**: manter SCC como alternativa é o
  que evita reescrever contrato às pressas.
- **LGPD**: sem decisão de adequação da ANPD para os EUA, o caminho prático
  são as cláusulas-padrão contratuais aprovadas pela ANPD.

### 8.8 Encarregado, segurança e incidente

**Encarregado** (LGPD art. 41): precisa ser indicado e o contato publicado.
Numa operação individual, pode ser você mesmo — o que a lei exige é que exista
e seja localizável.

**Segurança** (LGPD art. 46; RGPD art. 32): medidas técnicas compatíveis com o
risco. O desenho já ajuda muito — não há foto nem coordenada para vazar.

**Incidente** (LGPD art. 48; RGPD arts. 33 e 34): comunicação à ANPD e aos
titulares em prazo razoável quando houver risco relevante. Precisa existir um
procedimento escrito **antes** de acontecer, porque no dia não dá tempo de
inventar.

### 8.9 As declarações de loja

Ponto operacional que trava publicação, e por isso vem aqui e não numa nota de
rodapé.

- **Google Play — Data Safety**
- **Apple — Privacy Nutrition Labels**

Hoje a declaração correta seria "não coleta dados". Depois da Fase 2 passa a
ser "e-mail, identificadores, histórico de compras". **Declarar errado é
violação de política por si só**, independentemente da LGPD, e é motivo comum
de rejeição e de remoção.

Ambas as lojas também exigem URL de política de privacidade ativa — e a atual
descreve um produto sem conta.

### 8.10 O que fazer antes de publicar

1. Política de privacidade reescrita — deixa de ser descrição e passa a ser
   documento com efeito jurídico.
2. Política de retenção escrita (8.5).
3. Exclusão de conta acionável no app e por URL pública.
4. DPAs assinados com os quatro operadores.
5. Encarregado indicado e contato publicado.
6. Procedimento de incidente escrito.
7. Formulários de Data Safety e Privacy Labels preenchidos com o inventário
   de 8.2 na mão.
8. **Revisão profissional** de tudo acima — em especial os prazos de retenção
   e a papelada de transferência internacional.

---

## 9. Decisões ainda em aberto

- **Login obrigatório para tudo, ou só para o que é pago?** A decisão atual é
  obrigatório, com o freemium servindo de trial. Vale reavaliar: o app é usado
  em campo, e uma parede de login antes da primeira foto é atrito num momento
  ruim.
- **Onde o backend roda.** Existem dois projetos na Vercel: `lymark`
  (o site) e `lymark-app` (o build web do Expo). As rotas de API cabem no
  primeiro, mas isso precisa ser decidido, não assumido.
- **O que exatamente conta como foto**, na borda: reexportação com campos
  diferentes conta como nova?
