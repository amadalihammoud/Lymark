# Lymark Desktop (Electron)

Shell Electron para o Lymark que roda o build web do Expo.

## Estrutura

```
desktop/
├── main.ts          # Ponto de entrada do Electron
├── preload.ts       # Preload script (contextBridge)
├── electron-builder.yml  # Configuração do builder
├── tsconfig.json    # Configuração do TypeScript
├── package.json     # Dependências do Electron
└── .gitignore
```

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Instalação

```bash
cd desktop
npm install
```

## Desenvolvimento

### 1. Build do app web

No diretório raiz:
```bash
npm run web
# ou
npx expo export --platform web
```

### 2. Iniciar o Electron

No diretório desktop:
```bash
npm run start
```

## Build para Produção

### Windows

```bash
npm run build:win
```

Gera instaladores NSIS e portátil em `dist-electron/`.

### Linux

```bash
npm run build:linux
```

Gera AppImage e .deb em `dist-electron/`.

## Arquitetura

### Protocolo app://

O Electron usa um protocolo customizado `app://` para servir o build estático do Expo.

Isso resolve 4 problemas (conforme documento do projeto):
1. **file:// é opaque origin**: localStorage e IndexedDB lançam SecurityError
2. **Secure context**: navigator.mediaDevices e crypto.subtle exigem HTTPS ou app://
3. **Caminhos absolutos**: O expo export gera caminhos como /_expo/… que sob file:// resolvem para a raiz do disco
4. **MIME type WASM**: WebAssembly.instantiateStreaming precisa de Content-Type: application/wasm

### IPC Exposto

O preload expõe as seguintes APIs via `window.lymark`:

```typescript
{
  platform: 'desktop';
  saveFile: (bytes: Uint8Array, filename: string, mimeType: string) => Promise<SaveResult>;
  pickImage: () => Promise<PickResult>;
  pickImages: () => Promise<{ status: 'selected', photos: Array<{ uri: string; width: number; height: number }> }>;
}
```

### Segurança

- `contextIsolation: true` - Isola o contexto do renderer
- `nodeIntegration: false` - Desabilita integração com Node
- `sandbox: true` - Habilita sandbox
- Apenas APIs específicas são expostas via contextBridge

## Processamento em Lote

O handler `pick-images` permite selecionar múltiplas fotos para processamento em lote (requisito 2.4).

O processamento deve ser:
- **Serial, nunca paralelo** (G3)
- Com barra de progresso
- Relatório de falhas por arquivo
- Uma foto corrompida não aborta o lote

## Assinatura de Código

Para evitar o alerta do SmartScreen no Windows, é necessário assinar o instalador.

Opções:
- **Azure Trusted Signing**: ~$150/ano
- **Certificado OV/EV**: ~$200-500/ano

Ver seção 8 do documento do projeto para mais detalhes.
