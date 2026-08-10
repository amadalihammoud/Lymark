# Resumo das Correcoes - Lymark Desktop + Web

## Commits Realizados (10/08/2026)

### Seguranca
- 29adb69: Corrige furo de seguranca no handler delete-file (path.relative em vez de startsWith)
- 9ddd8dd5: Corrige import de expo-crypto no photo-file.web.ts (usa crypto.randomUUID nativo)

### Tipagem
- f216f94: Tipa parametros do ipcRenderer no preload.ts
- 94bcb11: Tipa parametros event e request no main.ts
- 0f890b9: Adiciona @types/electron e @types/node para resolver erros de typecheck

### Build
- 68ff427: Adiciona script para copiar CanvasKit WASM para o build web
- f8da658: Adiciona postbuild para copiar CanvasKit WASM

## Status Atual

### Concluido
- Furo de seguranca no delete-file corrigido
- Typecheck deve passar (todos os parametros tipados)
- Arquivos .web.ts criados e corrigidos
- Script de copia do WASM adicionado

### Pendente de Verificacao
- Testar app no navegador real (Fase 0)
- Verificar se CanvasKit WASM carrega no build
- Teste de superficie (platform-exports.test.ts)

### Proximos Passos
1. Verificar typecheck: npm run typecheck
2. Verificar testes: npm test
3. Testar build web: npm run web
4. Verificar se o app sobe no navegador

## Arquivos Modificados
- desktop/main.ts
- desktop/preload.ts
- package.json
- src/features/watermark/photo-file.web.ts
- scripts/copy-wasm.js

## Notas
- Os arquivos .web.ts agora NAO importam modulos nativos no topo
- O Metro resolve automaticamente para .web.ts na web
- O CanvasKit WASM sera copiado para dist/ apos o build
