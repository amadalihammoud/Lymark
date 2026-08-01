# Lymark

Aplicativo Expo para carimbar **marca d'água** em fotos: hora, data, dia da semana,
endereço e um código de rastreio — para registro de campo, vistoria e comprovação
de serviço.

Tudo acontece no aparelho. Não há servidor, conta ou envio de dados.

---

## Rodando

```bash
npm install
npx expo start
```

Abra no **Expo Go** lendo o QR code, ou rode `npm run android` / `npm run ios`.

As funções de câmera, galeria e localização exigem aparelho físico — não funcionam
no navegador.

## Comandos

| Comando             | O que faz                                |
| ------------------- | ---------------------------------------- |
| `npm start`         | Servidor de desenvolvimento              |
| `npm run android`   | Abre no Android conectado ou no emulador |
| `npm run ios`       | Abre no iOS (requer macOS)               |
| `npm run lint`      | ESLint                                   |
| `npm run typecheck` | TypeScript em modo `strict`, sem emitir  |

---

## Navegação

Três áreas, em abas, com `expo-router`:

| Aba               | Rota        | Papel                                   |
| ----------------- | ----------- | --------------------------------------- |
| **Capturar**      | `/`         | Tela inicial: foto, campos e exportação |
| **Galeria**       | `/gallery`  | Histórico das fotos já exportadas       |
| **Configurações** | `/settings` | Marca d'água, permissões e informações  |

Telas empilhadas **acima** das abas — abrem por cima e voltam sem perder nada:

- `/settings/watermark` — quais campos exibir, posição, tamanho, legibilidade
- `/settings/permissions` — estado real de câmera, fotos e localização
- `/settings/about` — versão e política de privacidade
- `/photo/[id]` — detalhe de uma foto do histórico

### Por que o estado sobrevive à navegação

Os providers ficam na raiz (`src/app/_layout.tsx`), **acima** do navegador de abas.
O rascunho de captura mora fora da árvore de telas, então ir até a Galeria, mudar
a posição da marca d'água em Configurações e voltar devolve a foto e os campos
exatamente como estavam. Nenhuma tela precisa salvar ou restaurar nada por conta
própria.

---

## Estrutura

```
src/
├── app/                    Rotas (expo-router). Só composição — sem regra de negócio.
│   ├── _layout.tsx         Providers + Stack raiz
│   ├── (tabs)/             As três abas
│   ├── settings/           Telas empilhadas de configuração
│   └── photo/[id].tsx      Detalhe do histórico
│
├── components/
│   ├── brand/              Identidade visual (Wordmark, AppHeader)
│   ├── capture/            Peças da tela de captura
│   ├── gallery/            Peças do histórico
│   └── ui/                 Blocos reutilizáveis (Button, FieldRow, Section…)
│
├── contexts/               Estado compartilhado, um provider por assunto
│   ├── capture-context     Rascunho: foto + metadados
│   ├── settings-context    Preferências de marca d'água (persistidas)
│   └── gallery-context     Índice do histórico (persistido)
│
├── features/               Regra de negócio, sem depender de tela
│   ├── capture/            Origem da foto (câmera / galeria)
│   └── watermark/          Conteúdo, geometria e exportação do carimbo
│
├── hooks/                  Ponte com APIs do aparelho (GPS, permissões)
├── lib/                    Utilidades puras (data, código, armazenamento)
├── theme/                  Cores, espaçamento e tipografia
└── types/                  Vocabulário de domínio compartilhado
```

### Convenções

- **TypeScript `strict`** em todo o projeto; `npm run typecheck` precisa passar limpo.
- **Arquivos em kebab-case**, componentes em `PascalCase`.
- **Import por alias**: `@/components/...`, nunca `../../..`.
- **Telas não estilizam do zero** — cor, espaçamento e texto saem de `src/theme`.
- **Uma fonte de verdade para o carimbo**: preview e imagem exportada passam pelo
  mesmo `buildWatermarkLines` e pelo mesmo `WatermarkOverlay`, então não podem divergir.

---

## Marca d'água

O que vai para a foto é decidido em `src/features/watermark/build-lines.ts`: entra
o campo que estiver **ligado nas preferências** e **tiver conteúdo**. Campo vazio
não vira linha em branco sobre a imagem.

A exportação (`export-photo.ts`) captura em JPEG a própria árvore de views do
preview com `react-native-view-shot` e salva via `expo-media-library`. Não existe
um segundo caminho de renderização — o que se vê é o que sai.

## Permissões

| Permissão   | Quando é pedida                   | Para quê             |
| ----------- | --------------------------------- | -------------------- |
| Câmera      | Ao tocar em "Tirar foto"          | Capturar a imagem    |
| Fotos       | Ao escolher da galeria / exportar | Ler e salvar imagens |
| Localização | Ao tocar em "Localizar"           | Preencher o endereço |

Negada em definitivo, a tela de Permissões encaminha para os Ajustes do sistema em
vez de mostrar um botão que não faz nada.
