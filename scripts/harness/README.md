# Harness de fidelidade do carimbo

Verifica que o carimbo desenhado fora do aparelho é o mesmo que o aparelho desenha. Existe porque a fidelidade da marca d'água é a exigência inegociável do projeto, e "parece igual" não é verificação.

## Os dois portões

**Geometria — exato, sem tolerância.** Compara números: posição, baseline, corpo, cor, espaçamento, rotação e o avanço medido de cada texto, mais a largura de tinta do relógio e os retângulos. Mesmas fontes e mesmo código de layout têm de produzir exatamente os mesmos números em qualquer plataforma.

É este portão que pega a falha mais perigosa do porte para a web: **uma fonte que não carrega não lança erro**. O Skia cai numa fonte de fallback e o carimbo sai errado em silêncio. Como os avanços de glifo mudam, todo `x` muda junto — e o portão acusa na hora.

**Raster — com tolerância, restrito ao que o carimbo desenha.** Compara pixels apenas dentro das regiões efetivamente desenhadas (tipicamente 6% a 11% da imagem), não a foto inteira. A tolerância existe porque antialiasing e desfoque divergem entre rasterizadores; perseguir zero pixel entre o Skia nativo e o CanvasKit seria perseguir o impossível.

| Par | Limiar | Por quê |
| --- | --- | --- |
| Node ↔ navegador ↔ Electron | 0,1% | Mesmo CanvasKit; divergência real deveria ser nula |
| qualquer um ↔ aparelho | 0,5% | Rasterizadores diferentes |

## Como rodar

```
npx tsc -p tsconfig.harness.json
node scripts/harness/render-node.js
node scripts/harness/compare-renders.js
```

No CI, use `--require-device` para que a ausência da referência de aparelho **reprove** em vez de apenas avisar.

As fotos de teste são geradas uma única vez por `make-test-photos.js` e versionadas. São PNG, não JPEG, de propósito: decodificadores JPEG diferem entre Android e CanvasKit, e essa diferença apareceria na conta como se fosse erro do carimbo.

## O que este harness NÃO faz

Sem os arquivos em `reference/android/`, ele compara apenas motores CanvasKit entre si. **Isso não é paridade com o mobile** — é consistência interna. O comparador diz isso em toda execução, e é intencional: um harness que finge ter verificado o que não verificou é pior que nenhum.

Rotação por EXIF fica de fora da fixture automática. Asset embutido não passa pelo seletor de imagens, então orientação é verificação manual à parte, para não contaminar o determinismo.

## Autoteste

O harness precisa ser capaz de falhar. Para comprovar:

```
LYMARK_HARNESS_BREAK_FONT=1 node scripts/harness/render-node.js
```

Isso simula a fonte do relógio não ter carregado. A comparação seguinte tem de reprovar, apontando a largura de tinta do relógio e o deslocamento da barra âmbar. Se passar, o harness está quebrado.

## Por que o desenho não é reimplementado aqui

`lib/skia-node.js` monta a API real do Skia sobre o CanvasKit (`JsiSkApi`) e carrega o `skia-stamp` compilado do próprio aplicativo. O harness chama o `createStampRenderer` de verdade.

A alternativa — reescrever o desenho no script — foi tentada antes e falhou de um jeito instrutivo: a cópia não desenhava a sombra nem aplicava `letterSpacing`. Como a faixa de fundo vem desligada por padrão, a sombra é o que sustenta a legibilidade do carimbo; e a marca e o código de foto usam espaçamento e rotação. Um harness que reimplementa o renderizador só compara a cópia consigo mesma.
