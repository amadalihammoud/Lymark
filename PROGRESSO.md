# Progresso - Portar Lymark para Web e Desktop

## Objetivo
Portar o aplicativo Lymark do mobile (React Native/Expo) para Web e Desktop (Electron) mantendo fidelidade pixel-perfect do carimbo.

**Branch:** claude/harness-fix

---

## Fase 6 - Processamento em Lote - CONCLUIDO

### Implementacoes Realizadas:

1. Rota /batch em src/app/_layout.tsx
2. Botao Processamento em Lote na CaptureScreen (desktop only)
3. Tela batch.tsx com:
   - Selecao multipla de fotos
   - Drag and drop (visual)
   - Metadados compartilhados
   - Selecao de pasta de saida
   - Barra de progresso
   - Relatorio de erros

4. Hook use-batch-processing.ts:
   - Processamento SERIAL
   - Leitura EXIF individual
   - Salvamento com saveFileToOutput

5. IPC Handlers em desktop/main.ts:
   - save-file-to-output
   - pick-images
   - select-output-folder
   - get-output-folder
   - add-drag-drop-file

6. Preload API em desktop/preload.ts:
   - saveFileToOutput
   - selectOutputFolder
   - getOutputFolder
   - onDragDrop

7. Abstracao em src/lib/file-storage.ts:
   - saveFileToOutput
   - pickImages
   - selectOutputFolder
   - getOutputFolder

---

## Correcoes de Seguranca e Tipagem

- Handler delete-file com validacao de caminho
- Parametros tipados em main.ts e preload.ts
- Tipos do Electron e Node adicionados

---

## Build e WASM

- Script copy-wasm.js
- Postbuild hook no package.json
- Protocolo app:// configurado

---

## Arquivos Modificados

- desktop/main.ts
- desktop/preload.ts
- src/app/_layout.tsx
- src/app/(tabs)/index.tsx
- src/app/batch.tsx
- src/hooks/use-batch-processing.ts
- src/lib/file-storage.ts
- scripts/copy-wasm.js
- package.json

---

## Proximos Passos

### Fase 0 - Testes Iniciais
- Testar app no navegador real
- Verificar CanvasKit WASM
- Verificar Skia
- Executar npm run typecheck
- Executar npm test
- Executar npm run web

### Fase 4 - Modulos Nativos
- Verificar isolamento de modulos nativos

### Fase 7 - CI/CD
- Configurar GitHub Actions

### Fase 8 - Deploy
- Configurar deploy para app.lymark.app

---

## Status Atual

- Fase 6: 95% completo (precisa de testes)
- Fase 0: 0% completo
- Fase 4: 80% completo
- Fase 7: 0% completo
- Fase 8: 0% completo

---

## Como Testar

### Desktop:
npm run desktop:dev
1. Clique em Processamento em Lote
2. Selecione fotos ou arraste e solte
3. Preencha metadados
4. Selecione pasta de saida
5. Iniciar Processamento

### Web:
npm run web

---

Ultima atualizacao: 10/08/2026
