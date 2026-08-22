# Canvas de design — Atlas Lymark

Arquivos-fonte do canvas de design publicado como Artifact ("Atlas Lymark"):
as três versões do app (celular, desktop, site), as disposições do carimbo
(posição, faixa de fundo, tamanho, código) e as personalizações de marca,
logotipo e cores.

- Cada `*.dc.html` é uma prancheta (artboard) autocontida; `canvas.json`
  posiciona as pranchetas em três páginas e guarda as notas.
- Tudo foi desenhado com os tokens reais de `src/theme` e as medidas de
  `src/features/watermark/stamp-layout.ts` — marinho `#15243C`, âmbar
  `#F3C218`, Space Grotesk/IBM Plex Mono na interface, Pathway Gothic One e
  Barlow no carimbo.
- Os quadros marcados **no app** já estão no código (`stamp-layout.ts` +
  `preferences.ts`): a faixa larga (acima de 2,4 de proporção o logo adota a
  largura do bloco), o tamanho ajustável do logotipo (50%–250%,
  `brandLogoScale`) e o canto próprio (`brandLogoPosition`). Os marcados
  **proposta** ainda **não** existem: o logotipo em pé com título/subtítulo
  e a tipografia da marca (hoje a fonte do carimbo é fixa por decisão
  documentada em `src/theme/fonts.ts`). Os brasões e logos são desenhos
  genéricos de exemplo, não marcas reais.
- Na página "Fluxo v2 — direções", a direção **B (documento)** foi a
  escolhida em 22/08 — vale para desktop e navegador, que compartilham a
  mesma tela larga.

Estes arquivos são o material de trabalho para re-gerar/atualizar o canvas;
não entram no bundle do aplicativo.
