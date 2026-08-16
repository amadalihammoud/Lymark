# Autenticidade — integridade, autoria e veracidade

O selo do Lymark responde a uma acusação específica: *"essa foto foi editada
depois"*. Ele não promete o que nenhum sistema pode saber — se o endereço e a
hora impressos são verdade — e é essa honestidade que o torna defensável.

A separação é a mesma do `docs/ASSINATURA.md` (identidade ≠ pagamento ≠
acesso), aplicada à prova:

| Camada | Pergunta que responde | Quem responde |
|---|---|---|
| **Integridade** | Este arquivo foi alterado depois de exportado? | O selo (criptografia) |
| **Autoria** | Quem emitiu, e quando (relógio do servidor)? | O selo (conta + servidor) |
| **Veracidade** | O que o carimbo declara é verdade? | **O emissor** — declaração |

Editar endereço, data e hora antes de exportar não é fraude: é ajustar uma
declaração antes de assiná-la — como em qualquer documento declaratório. O
selo registra *quem* declarou e *quando emitiu*; o conteúdo declarado é
responsabilidade de quem emite, e a página de verificação diz isso com todas
as letras.

---

## 1. O desenho — stateless, local, sem banco

Três decisões estruturais, todas por desempenho e privacidade:

1. **Nenhum banco.** O selo é um recibo assinado (Ed25519) que viaja DENTRO
   do próprio JPEG. O servidor não guarda nada por foto — assina e esquece.
2. **A verificação acontece no navegador.** A página `/verificar` faz tudo
   com WebCrypto: o arquivo **nunca sobe** para servidor nenhum. Custo de
   servidor zero, privacidade total — coerente com "suas fotos ficam no
   aparelho".
3. **A emissão é best-effort.** Sem rede na exportação, a foto sai normal,
   sem selo — o carimbo nunca é refém do servidor. O selo é um upgrade
   quando há rede, não um requisito.

## 2. O recibo

```
LYM1.<payload base64url>.<assinatura base64url>
payload = { "v": 1, "h": "<sha256 base64url>", "sub": "user_…", "iat": <epoch s> }
```

- `h` — SHA-256 dos bytes do JPEG **sem o segmento do selo** (ver §3).
- `sub` — a conta emissora (Clerk userId), a mesma da Fase 2.
- `iat` — o instante de emissão, no relógio **do servidor**. É o dado de
  tempo que nem o emissor consegue manipular.
- Assinatura Ed25519 sobre `"LYM1." + payload`, com a chave privada do
  servidor (`ATTEST_PRIVATE_KEY`). A pública é publicada no site
  (`NEXT_PUBLIC_ATTEST_PUBLIC_KEY`) e embutida na página de verificação.

## 3. Onde o recibo mora — o segmento COM do JPEG

O recibo entra num segmento de comentário JPEG (`FFFE`), logo após o SOI,
com o prefixo `lymark-selo:`. O ovo-e-galinha (o hash não pode cobrir o
próprio recibo) resolve-se por convenção: **o hash cobre o arquivo sem o
segmento do selo** — a emissão calcula o hash antes de embutir; a
verificação remove o segmento antes de recalcular. As duas pontas usam o
MESMO código (`src/features/attest/jpeg-seal.ts`), importado pelo app e
pelo site — uma definição só, como o contrato de entitlements.

Comentários JPEG são ignorados por todo visualizador; a foto abre igual em
qualquer lugar.

**Vídeo (MP4)** tem a segunda convenção, com a mesma regra: uma caixa de
topo `lymk` ANEXADA AO FIM do arquivo (`src/features/attest/mp4-seal.ts`) —
reprodutores ignoram caixas desconhecidas, e selar um vídeo de um giga é um
`append` de ~300 bytes mais um hash por stream, no processo principal do
desktop, sem tocar a memória. O hash cobre o arquivo sem a caixa. A página
de verificação decide a convenção pelo CONTEÚDO (SOI × `ftyp`), nunca pela
extensão. WebM (saída da web) e o vídeo do celular ficam para a etapa
seguinte.

## 4. Os fluxos

**Emissão** (exportação de foto, todas as plataformas):
1. Compõe o carimbo → bytes do JPEG.
2. SHA-256 local dos bytes.
3. Com sessão e rede: `POST /api/attest { hash }` com o token da Fase 2
   (Clerk ou token do desktop — o MESMO `verify` da API de entitlements).
   Tempo máximo curto: a exportação não espera o servidor além disso.
4. Resposta `{ receipt }` → recibo embutido no COM → arquivo salvo.
   Sem rede/sessão/resposta: salva sem selo, sem erro e sem atraso extra.

**Verificação** (`lymark.app/verificar`, pública, 12 idiomas):
1. A pessoa arrasta o arquivo. Ele não sai do navegador.
2. Extrai o recibo do COM; remove o segmento; SHA-256 via WebCrypto.
3. Confere hash × recibo e assinatura × chave pública.
4. Veredito com as três camadas ditas separadamente:
   - **Íntegra** — "Este arquivo está exatamente como saiu do Lymark.
     Emitido pela conta ‹…› em ‹data/hora do servidor›."
   - Sempre acompanhado de: "O que o carimbo declara (endereço, data, hora)
     é declaração do emissor — o selo atesta a integridade e a emissão, não
     o conteúdo."
   - **Sem selo** — "Este arquivo não tem selo do Lymark. Pode ter sido
     exportado offline ou não vir do Lymark." (neutro, não acusatório)
   - **Adulterada** — "O conteúdo não corresponde ao selo: o arquivo foi
     modificado depois da emissão, ou o selo foi transplantado."

## 5. O que o desenho resiste — e o que não promete

- **Editar a foto depois** → hash muda → adulterada. ✔
- **Transplantar o selo para outra foto** → hash não bate → adulterada. ✔
- **Forjar um recibo** → exige a chave privada do servidor. ✔
- **Atrasar o relógio do aparelho** → irrelevante: `iat` é do servidor. ✔
- **Declarar endereço/data falsos** → fora do escopo, POR DESENHO: o selo
  mostra quem declarou e quando emitiu; a mentira fica assinada e datada,
  atribuível ao emissor. É como funciona qualquer declaração com fé de quem
  a faz.
- **Reexportar a mesma cena** com outros dados → novo documento, novo selo,
  novo `iat`. O selo não impede; apenas data. (Quem compara dois documentos
  da mesma cena vê dois `iat` — e a divergência fala por si.)

## 6. Variáveis de ambiente

| Onde | Nome | O quê |
|---|---|---|
| Vercel (site) | `ATTEST_PRIVATE_KEY` | chave Ed25519 privada, PKCS8 DER em base64 |
| Vercel (site) | `NEXT_PUBLIC_ATTEST_PUBLIC_KEY` | chave pública, SPKI DER em base64 |

Gerar o par: `node -e "const c=require('crypto');const{publicKey,privateKey}=c.generateKeyPairSync('ed25519');console.log(privateKey.export({type:'pkcs8',format:'der'}).toString('base64'));console.log(publicKey.export({type:'spki',format:'der'}).toString('base64'))"`

Sem as chaves, `/api/attest` responde 503, a exportação segue sem selo e a
página de verificação avisa que o serviço ainda não está configurado — a
degradação dita de sempre.

## 7. Rotação de chave (registrado desde já)

O prefixo `LYM1` versiona o formato. Uma troca de chave entra como `LYM2`
com chave nova; a página de verificação guarda as públicas antigas e
verifica pelo prefixo. Nada disso precisa existir hoje — só o prefixo, que
já existe.
