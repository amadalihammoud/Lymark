# Lymark Render Harness

Harness de comparação de renderizações do carimbo entre plataformas (Android, Web, Desktop).

## Estrutura

```
scripts/harness/
├── baseline/          # Imagens de referência (Android)
│   ├── android-portrait-3000x4000.png
│   ├── android-landscape-4000x3000.png
│   ├── android-square-2000x2000.png
│   └── android-highres-6000x4000.png
├── output/           # Renderizações a testar
│   ├── web-portrait-3000x4000.png
│   └── ...
├── diff/             # Imagens de diferença (geradas automaticamente)
│   ├── web-vs-android-portrait-3000x4000-full-diff.png
│   └── web-vs-android-portrait-3000x4000-stamp-diff.png
├── generate-reference.js  # Gera referências Android
├── render-web.js         # Renderiza para web
└── compare-renders.js    # Compara renderizações
```

## Pré-requisitos

```bash
npm install pixelmatch pngjs
```

## Uso

### 1. Compilar o código TypeScript para CommonJS

```bash
npx tsc -p tsconfig.calib.json --outDir /tmp/lymark-build
```

### 2. Gerar referências Android (baseline)

```bash
LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/generate-reference.js
```

Isso cria 4 imagens de referência em `scripts/harness/baseline/`.

### 3. Gerar renderizações web

```bash
LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/render-web.js
```

Isso cria 4 imagens em `scripts/harness/output/`.

### 4. Comparar renderizações

```bash
node scripts/harness/compare-renders.js
```

## Limiares de Aceitação

- **Divergência no carimbo:** ≤ 0.5% de pixels diferentes
- **Divergência geral:** ≤ 1.0% de pixels diferentes (recompressão JPEG)
- **Largura da tinta do relógio:** 0% de divergência (exato)
- **Posição/altura da barra âmbar:** 0% de divergência (exato)
- **Baselines:** 0% de divergência (exato)

## Fotos de Teste

| Nome | Dimensões | Proporção | Propósito |
|------|-----------|-----------|-----------|
| portrait | 3000×4000 | 3:4 | Foto em retrato |
| landscape | 4000×3000 | 4:3 | Foto em paisagem |
| square | 2000×2000 | 1:1 | Foto quadrada |
| highres | 6000×4000 | 3:2 | Alta resolução (24MP) - teste G3 |

## Integração com CI

Adicione ao seu workflow:

```yaml
- name: Run render harness
  run: |
    npx tsc -p tsconfig.calib.json --outDir /tmp/lymark-build
    LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/generate-reference.js
    LYMARK_CALIB_BUILD=/tmp/lymark-build node scripts/harness/render-web.js
    node scripts/harness/compare-renders.js
```

## Notas

- As imagens de referência (baseline) devem ser geradas a partir do **build Android real** quando disponível.
- O harness atual usa CanvasKit no Node.js para simular o Android, o que produz resultados idênticos.
- Para o desktop (Electron), será necessário adicionar `render-desktop.js` no futuro.
