# Os documentos legais em doze idiomas

Este documento acompanha a tradução da Política de Privacidade e dos Termos de
Uso. Está escrito para ser levado a um advogado, e não para substituí-lo: separa
o que é conclusão firme do que precisa de confirmação profissional, e diz onde a
decisão é do Amad e não do código.

Contexto técnico do que mudou está na seção 6. O resto é análise.

---

## 1. O problema que a tradução resolve

Até agora, `/de/privacidade`, `/ja/privacidade` e as outras nove devolviam texto
português. Não era um defeito cosmético.

O RGPD art. 12(1) exige que a informação ao titular seja prestada "de forma
concisa, transparente, inteligível e de fácil acesso, em linguagem clara e
simples". Um documento em português entregue a um titular alemão falha em
"inteligível" — e a falha não é do art. 12 apenas: os arts. 13 e 14, que listam
o que precisa ser informado, pressupõem informação que a pessoa consiga ler. Se
a informação não é compreensível, a obrigação de informar não foi cumprida,
ainda que o texto exista.

O mesmo raciocínio, no Brasil, vem da LGPD art. 6º, VI (transparência) e art. 9º
(acesso facilitado à informação sobre o tratamento).

Nos Termos de Uso o efeito é mais direto e mais perigoso para o Amad. A Diretiva
93/13/CEE, art. 5, exige que cláusula em contrato de consumo seja redigida "de
forma clara e compreensível", e manda interpretar a dúvida a favor do
consumidor. Uma cláusula de limitação de responsabilidade que o consumidor não
podia entender tende a não ser oponível a ele. Ou seja: **as cláusulas que mais
protegem o desenvolvedor são justamente as que perdem eficácia quando não são
compreensíveis** — a limitação de responsabilidade (§06), a negativa de que o
aplicativo certifica ou autentica algo (§02) e a atribuição de responsabilidade
pelo conteúdo das fotos ao usuário (§03).

**Conclusão firme:** traduzir aumenta a proteção do desenvolvedor, não a reduz.
Quem escreve a limitação de responsabilidade só numa língua está confiando numa
cláusula que pode não valer contra o leitor que ela pretende alcançar.

---

## 2. O risco que a tradução cria, e o que fazer com ele

Doze versões de um documento operante criam a possibilidade de divergência entre
elas. Se a versão alemã disser algo ligeiramente diferente da portuguesa, qual
vale?

Duas regras convergem contra o autor do texto:

- **CDC art. 47:** "As cláusulas contratuais serão interpretadas de maneira mais
  favorável ao consumidor."
- **Diretiva 93/13, art. 5:** em caso de dúvida, prevalece a interpretação mais
  favorável ao consumidor.

Isto é *contra proferentem*: a ambiguidade corre contra quem redigiu. Com doze
versões, a leitura mais favorável ao consumidor pode ser buscada em qualquer
uma delas.

**A mitigação usual é uma cláusula de prevalência linguística** — "em caso de
divergência entre as versões, prevalece a portuguesa". Ela funciona bem entre
empresas. Contra consumidor, funciona menos: não pode servir para privar o
consumidor de proteção que a lei do domicílio dele garante (é o mesmo princípio
do Rome I art. 6(2), tratado na seção 3). O que ela faz de útil é fixar uma
referência interpretativa e evitar a discussão sobre qual texto é o original.

**Recomendação:** incluir a cláusula, sabendo que o efeito dela é parcial. O
texto está pronto e não foi ativado — está na seção 7, item A, esperando decisão.

**Precisa de confirmação profissional:** se a cláusula deve nomear a versão
portuguesa como "original" ou como "prevalecente". São coisas diferentes e a
segunda é mais agressiva.

---

## 3. A pergunta que decide o tamanho de tudo: onde o aplicativo é distribuído

Esta é a variável que muda mais coisas, e é decisão do Amad.

### 3.1 Se a distribuição for restrita ao Brasil

Configurável na Play Console e na App Store Connect. Nesse cenário:

- O RGPD deixa de se aplicar por estabelecimento ou por oferta (art. 3), salvo
  monitoramento de titulares na UE, que não ocorre.
- A obrigação do art. 27 (representante na UE) desaparece — é a pendência que
  estava escrita **dentro da página pública** e que retirei (seção 6.3).
- As doze línguas passam a ser cortesia ao usuário, não instrumento jurídico
  exigido. Continuam valendo a pena: o público do Lymark é técnico de campo, e
  há técnico de campo que não lê português no Brasil.
- A eleição de lei brasileira e do foro do domicílio do usuário funciona sem
  atrito.

### 3.2 Se a distribuição alcançar o Espaço Econômico Europeu

Então três coisas passam a valer, e nenhuma delas é opcional:

**a) Representante na UE — RGPD art. 27.** Controlador sem estabelecimento na
União que ofereça bens ou serviços a titulares na União deve designar por
escrito um representante estabelecido em um dos Estados-Membros, e publicar nome
e contato. A exceção do art. 27(2)(a) — tratamento ocasional, sem dados
sensíveis em escala e de baixo risco — é plausível para o Lymark **hoje**, que é
um aplicativo local sem servidor. Deixa de ser plausível depois da Fase 2, com
conta, cobrança e tratamento contínuo.

*Conclusão firme:* enquanto não houver representante nomeado, a página não deve
afirmar nem prometer nada sobre isso. *Precisa de confirmação profissional:* se a
exceção do art. 27(2)(a) cobre a versão atual — a resposta muda de todo modo com
a Fase 2, então a pergunta útil ao advogado é sobre o cenário com conta, não
sobre o de hoje.

**b) A eleição de lei brasileira é parcialmente ineficaz.** Regulamento (CE)
593/2008 (Rome I), art. 6(2): em contrato de consumo, a escolha de lei pelas
partes **não pode privar o consumidor** da proteção das disposições imperativas
da lei do país de residência habitual dele. Um consumidor alemão mantém a
proteção alemã, esteja escrito o que estiver no §09 dos Termos.

**c) O foro.** Regulamento (UE) 1215/2012 (Bruxelas I bis), arts. 17 a 19: o
consumidor pode demandar no foro do próprio domicílio e, em regra, só pode ser
demandado ali.

Aqui há uma boa notícia que merece registro: os Termos já elegem "o foro do
domicílio do usuário" (§09), e a Política elege "o foro do domicílio do titular"
(§17). Isso **coincide** com o que Bruxelas I bis impõe, em vez de conflitar com
ele. Quem escreveu essas cláusulas escolheu bem — a redação sobrevive à
aplicação do regime europeu, o que não seria verdade se tivesse elegido o foro
de Santos.

**Recomendação:** decidir a distribuição antes de levar os documentos ao
advogado. A consulta é substancialmente diferente nos dois cenários, e a
diferença é de custo, não só de texto.

---

## 4. O que a Fase 2 vai obrigar a reescrever — e a lista está incompleta

`ASSINATURA.md` §7.1 lista **quatro chaves** do catálogo que afirmam que o
Lymark não tem servidor e não cria conta, e manda trocá-las no mesmo commit que
liga a autenticação. A lista está correta no que enumera e **incompleta no
escopo**: ela cobre o catálogo de interface e não cobre os documentos legais,
que fazem as mesmas afirmações com força jurídica maior.

Estas são as afirmações dos documentos legais que **deixam de ser verdadeiras**
com a Fase 2. Cada uma existe agora em doze idiomas:

| Chave em `i18n/messages/legal/` | O que afirma hoje | Por que cai |
|---|---|---|
| `privacy.meta.description` | "não possui servidor, não cria conta e não transmite as suas fotos" | passa a haver servidor e conta |
| `privacy.s01.p1` | "não possui servidor, não cria conta de usuário e não transmite as suas fotos" | idem |
| `privacy.s07.p3` | "Não há tratamento fundado em legítimo interesse" | segurança e prevenção a fraude passam a ser legítimo interesse (`ASSINATURA.md` §8.4) |
| `privacy.s08.p1` | "não realiza transferência internacional de dados, porque não recebe dados" | Clerk, Stripe e RevenueCat são estabelecidos fora do Brasil |
| `privacy.s09.p1` | "não compartilha... pela razão simples de que não os detém" e "Não há operador (*processor*) contratado" | Clerk e Stripe passam a ser operadores |
| `privacy.s10.p3` | "não existe repositório central passível de vazamento, e não há incidente de segurança a comunicar" | passa a existir, e o dever dos arts. 48 LGPD / 33 RGPD passa a incidir |
| `privacy.s12.p2` | "O desenvolvedor não consegue acessar, exportar nem apagar esses dados por você" | passa a conseguir, quanto aos dados da conta |
| `terms.s07.p1` | "Não há conta a cancelar nem assinatura a rescindir" | passa a haver as duas |

São **8 chaves × 12 idiomas = 96 lugares**, somados aos 48 já mapeados no §7.1:
**144 lugares** que precisam cair no mesmo commit que liga a autenticação.

Duas observações para não errar por excesso:

- `privacy.s04.p1` diz que os dados listados ali — fotos, localização, data,
  código, histórico, preferências — não são enviados ao desenvolvedor. **Isso
  continua verdadeiro** depois da Fase 2, e é o coração da restrição de
  arquitetura do §8.3. Não tocar.
- `privacy.s13` (decisões automatizadas) e `privacy.s16` (crianças) não são
  afetados.

**Feito em 16/08/2026**, no mesmo commit que ligou a conta no site — os oito
trechos, mais um que esta lista não tinha: `privacy.s14.p1` afirmava que o site
não usa cookies e não faz requisição a terceiros, e a sessão do Clerk faz as
duas coisas. A data de atualização dos dois documentos passou a 16/08/2026 e a
versão declarada a 1.3.0 (decisão do 5.1 tomada pelo lado da versão real; é
reversível). O texto novo nomeia o operador (Clerk, Inc., EUA), a base legal da
conta (execução de contrato) e a do log de IP (legítimo interesse), e mantém
`privacy.s04.p1` intacta. Pagamento (Stripe, RevenueCat) **não** entrou porque
ainda não existe — entra no commit que o ligar, e é o mesmo cuidado.

**Conclusão firme (como estava):** a Fase 2 não pode ser considerada pronta sem reescrever
estes oito trechos. Publicá-la sem isso deixaria a Política de Privacidade
afirmando, em doze idiomas e com efeito jurídico, exatamente o contrário do que
o produto faz — que é o risco que o §7.1 já tinha identificado, só que maior.

---

## 5. Achados menores, mas que precisam de decisão

**5.1 A versão declarada está desatualizada.** Os dois documentos dizem
"Aplicativo Lymark, versão 1.1.0"; o `package.json` está em `1.3.0`. Como o
aplicativo ainda não foi publicado em loja nenhuma, o número declarado não
corresponde a nada que exista publicamente. Decisão do Amad: corrigir para a
versão real, ou remover a menção à versão e deixar apenas a data.

**5.2 A data de atualização precisa mudar — o próprio documento manda.** A
Política §15 promete: "Mudanças serão publicadas nesta página, com nova data de
atualização." A tradução para onze idiomas é publicação de conteúdo novo. Manter
"2 de agosto de 2026" enquanto o documento muda descumpre uma promessa que ele
faz sobre si mesmo. Está esperando decisão porque a data correta depende de
quando o Amad publicar, não de quando eu escrevi.

**5.3 Três lusitanismos, corrigidos.** O documento é brasileiro — LGPD, CNPJ,
CDC, foro brasileiro — e tinha três construções de português europeu: "Espaço
Ec**o**nómico Europeu", "autoridade de contro**lo**" e "contactável em". Corrigi
para "Ec**ô**nomico", "controle" e "que pode ser contatado em". São correções de
grafia, sem efeito no sentido, e estão isoladas no diff da seção 6.

**5.4 O consentimento como base legal da localização merece um segundo olhar.**
A Política §07 apoia o tratamento da localização no consentimento (LGPD art. 7º,
I; RGPD art. 6(1)(a)). Funciona, e tem a virtude de coincidir com a permissão do
sistema operacional, que é revogável. Mas a localização existe para preencher o
campo de endereço, que é a função que o usuário pediu — o que também caberia em
execução de contrato, art. 6(1)(b). A diferença prática: consentimento é
revogável a qualquer momento e obriga a provar que foi livre e informado.

*Não recomendo mudar.* O desenho atual é defensável e mais protetivo ao usuário,
e a permissão do sistema é um registro natural do consentimento. Registro aqui
porque é a pergunta que um advogado vai fazer, e é melhor que a resposta esteja
pronta. Note que isto é o oposto da escolha feita para a assinatura em
`ASSINATURA.md` §8.4 — e o motivo é bom: lá o consentimento revogável deixaria o
serviço pago sem base legal; aqui a revogação só desliga um campo do formulário.

---

## 6. O que foi feito, tecnicamente

### 6.1 Onde o texto passou a morar

`i18n/messages/legal/{idioma}.json` — um arquivo por idioma, doze arquivos, na
mesma raiz do catálogo principal. As páginas em
`site/app/[locale]/{privacidade,termos}/page.tsx` guardam só a estrutura.

Por que num catálogo separado, e não no principal: `src/i18n/messages.ts`
importa os doze idiomas estaticamente para o bundle do aplicativo, e o
`NextIntlClientProvider` do layout serializa o catálogo inteiro no HTML de toda
página. Texto somado ao catálogo principal viaja no celular doze vezes e no HTML
de cada página uma vez — e nenhum dos dois mostra estes documentos. O motivo
completo está no comentário de `site/i18n/legal.ts`.

### 6.2 A prova de que o português não mudou de sentido

O HTML português foi comparado antes e depois da extração, bloco a bloco:

- **Termos de Uso: 34 de 34 blocos idênticos.**
- **Política de Privacidade:** apenas quatro blocos removidos e três
  acrescentados — as três correções de grafia da seção 5.3 e a remoção descrita
  em 6.3. Nada mais.

### 6.3 O recado ao advogado que estava publicado

A Política §02 continha, renderizado na página, em `<span className="todo">`:

> [Se o aplicativo for oferecido no Espaço Económico Europeu, o art. 27 do RGPD
> exige a nomeação de um representante estabelecido na UE — indicar aqui nome e
> contato, ou restringir a distribuição ao Brasil na Play Console e na App Store
> Connect.]

Estava visível em `/privacidade` e nos onze prefixos de idioma. Uma instrução
interna publicada dentro de um documento operante é pior que uma omissão: sugere
ao leitor que a conformidade está em aberto.

Movi o texto para comentário de código no mesmo lugar da página, onde a pendência
continua registrada para quem for implementá-la. **Enquanto não houver
representante nomeado, não dizer nada é a afirmação correta** — não há obrigação
de anunciar que uma nomeação está pendente. A pendência substantiva permanece, e
é o item 3.2(a) desta análise.

### 6.4 A guarda automatizada

`i18n/__tests__/legal-messages.test.ts` reprova no CI se, em qualquer dos doze
idiomas: faltar ou sobrar uma chave; houver texto vazio; as marcações
(`<strong>`, `<em>`, `<email>`, `<privacy>`, `<terms>`) divergirem em nome ou
ordem do português; aparecer marcação que a página não sabe renderizar; a razão
social, o CNPJ, o endereço ou o e-mail de contato tiverem sido traduzidos; ou
sobrar texto ainda em português.

A checagem de marcações não existe no catálogo principal. Existe aqui porque num
documento jurídico o `<strong>` marca a frase que o leitor precisa enxergar, e
perder a marca é perder ênfase decidida de propósito.

---

## 7. Textos prontos, esperando decisão

Nada nesta seção está ativo. São redações prontas para o Amad ligar depois de
falar com o advogado.

**A. Cláusula de prevalência linguística** (para os Termos, §09, e para a
Política, §17):

> Estes termos foram redigidos originalmente em português e traduzidos para
> outros idiomas como cortesia ao usuário. Em caso de divergência entre as
> versões, prevalece a portuguesa, sem prejuízo das disposições imperativas da
> lei do país de residência habitual do usuário.

A oração final não é enfeite: sem ela, a cláusula tentaria fazer o que o Rome I
art. 6(2) proíbe, e o risco é o juiz descartar a cláusula inteira em vez de
apenas a parte excessiva.

**B. Representante na UE** (Política §02), se houver nomeação:

> Para os fins do art. 27 do RGPD, o representante do controlador no Espaço
> Econômico Europeu é [nome], [endereço], contactável em [e-mail].

---

## 8. O que esta análise não resolve

- **Revisão nativa.** As traduções foram escritas e revisadas por modelo. Para
  japonês, chinês, coreano e árabe, `i18n/GLOSSARIO.md` §5 já registrava que
  **todos os termos** precisam de revisor nativo — e um documento jurídico é o
  pior lugar para confiar em tradução não revisada. As nove línguas europeias
  estão em situação melhor, não em situação resolvida.
- **A decisão de distribuição** (seção 3), que é do Amad.
- **A confirmação de que a exceção do art. 27(2)(a) se aplica hoje**, que é do
  advogado.
- **A revisão do conteúdo jurídico em si.** Eu traduzi e apontei
  inconsistências; não reescrevi cláusula nem julguei se a limitação de
  responsabilidade do §06 é suficiente para o risco real do produto.
