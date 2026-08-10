/**
 * Script para copiar o CanvasKit WASM para o build web.
 * Este script é executado após o expo export para garantir que o .wasm
 * está disponível no build estático.
 */

import fs from 'fs';
import path from 'path';

const WASM_SOURCE = path.join(process.cwd(), 'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm');
const WASM_DEST = path.join(process.cwd(), 'dist/canvaskit.wasm');

try {
  // Verificar se o fonte existe
  if (!fs.existsSync(WASM_SOURCE)) {
    console.error('CanvasKit WASM não encontrado em:', WASM_SOURCE);
    process.exit(1);
  }

  // Criar pasta dist se não existir
  const distDir = path.dirname(WASM_DEST);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copiar o WASM
  fs.copyFileSync(WASM_SOURCE, WASM_DEST);
  console.log('✅ CanvasKit WASM copiado para:', WASM_DEST);
} catch (error) {
  console.error('❌ Falha ao copiar CanvasKit WASM:', error);
  process.exit(1);
}