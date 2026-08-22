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
- As pranchetas marcadas como **proposta** ainda **não** existem no código:
  as de logotipo (em pé com título/subtítulo; largo na largura do bloco) —
  hoje `stamp-layout.ts` amarra a altura do logo ao texto e contém proporções
  acima de 2,4 — e a de tipografia da marca (hoje a fonte do carimbo é fixa
  por decisão documentada em `src/theme/fonts.ts`). Os brasões e logos são
  desenhos genéricos de exemplo, não marcas reais.

Estes arquivos são o material de trabalho para re-gerar/atualizar o canvas;
não entram no bundle do aplicativo.
