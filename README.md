# Lymark

Aplicativo Expo (React Native) para carimbar **marca d'água** em fotos e vídeos:
hora, data, dia da semana, endereço, código de rastreio e marca própria — para
registro de campo, vistoria e comprovação de serviço.

O carimbo é desenhado com **React Native Skia** (mesmo caminho no preview e na
exportação). Conta e planos usam **Clerk** + entitlements (cota grátis vitalícia
por conta e assinatura Pro via Stripe / lojas). Fotos e vídeos ficam no aparelho;
o servidor só autentica, mede cota e emite o selo de autenticidade.

---

## Rodando

```bash
npm install
npx expo start
```

- **Expo Go**: captura de foto, galeria e localização funcionam; o **módulo nativo
  de vídeo** não — use um build EAS no celular, ou o desktop / web.
- **Celular (EAS)**: `eas build` / app da loja — inclui carimbo de vídeo (Android
  via Media3; ver disponibilidade do módulo no iOS).
- **Web**: `npx expo start --web` — vídeo em tempo real (WebM).
  Produção: **https://lymark.app/web** (mesmo domínio da landing; ver
  `docs/WEB-URL.md`). Desktop usa `npm run web:build` (raiz); o site usa
  `npm run web:build:hosted` (`LYMARK_WEB_BASE=/web`).
- **Desktop**: pasta `desktop/` (Electron + ffmpeg) — MP4, vídeo longo.

```bash
npm run android   # aparelho/emulador
npm run ios       # macOS
npm run lint
npm run typecheck
```

---

## Navegação

| Aba / rota        | Papel                                              |
| ----------------- | -------------------------------------------------- |
| **Capturar** `/`  | Foto, campos e exportação                          |
| **Galeria**       | Histórico das fotos exportadas                     |
| **Configurações** | Marca d'água, permissões, conta / plano            |
| `/video`          | Carimbo de vídeo (EAS / desktop / web)             |
| `/batch`          | Lote (desktop)                                     |
| `/photo/[id]`     | Detalhe do histórico                               |

Os providers ficam na raiz (`src/app/_layout.tsx`), acima das abas — o rascunho
de captura e as preferências sobrevivem à navegação.

---

## Estrutura

```
src/
├── app/                 Rotas (expo-router)
├── components/          UI e peças de tela
├── contexts/            Estado compartilhado (captura, settings, galeria, entitlement…)
├── features/
│   ├── watermark/       Skia: overlay, render, exportação de foto
│   ├── video/           Carimbo no navegador
│   ├── entitlements/    Cota, lease, sync com a API
│   ├── attest/          Selo de autenticidade
│   └── auth/            Clerk / tokens
├── hooks/ lib/ theme/ types/
desktop/                 Electron + ffmpeg
site/                    Next.js — conta, Stripe, /api/entitlements, /api/attest
modules/video-stamp/     Módulo nativo de composição de vídeo
i18n/messages/           Traduções
```

### Convenções

- TypeScript `strict`; `npm run typecheck` limpo.
- Arquivos em kebab-case; import por alias `@/…`.
- Uma fonte de verdade para o carimbo: foto e vídeo usam o mesmo overlay Skia.

---

## Marca d'água e vídeo

- **Foto**: Skia compõe o carimbo; `export-photo.ts` salva com
  `MediaLibrary.Asset.create` (SDK 57) e/ou compartilha.
- **Vídeo (EAS)**: módulo nativo + mesmo overlay PNG; salva na galeria com o
  mesmo padrão de permissões/`Asset.create`.
- **Vídeo (desktop)**: ffmpeg no processo principal.
- **Vídeo (web)**: canvas + MediaRecorder (tempo real, WebM).

Data, hora e dia da semana vêm preenchidos (arquivo / agora) e **continuam
editáveis** — não há forçar EXIF.

## Conta e plano

- Login com Clerk (quando `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` está definida).
- Cota grátis vitalícia por conta; Pro via pagamento.
- API em `https://lymark.app/api/entitlements` e selo em `/api/attest`.

## Permissões

| Permissão    | Quando                         | Para quê                |
| ------------ | ------------------------------ | ----------------------- |
| Câmera       | Tirar foto / gravar vídeo      | Captura                 |
| Microfone    | Gravar vídeo                   | Áudio da gravação       |
| Fotos/vídeos | Galeria / exportar             | Ler e salvar mídia      |
| Localização  | “Localizar”                    | Preencher endereço      |
