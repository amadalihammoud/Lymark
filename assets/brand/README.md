# Handoff: Logo LY (monograma vetorial)

## Overview
Monograma "LY" — L branco e Y âmbar sobre azul-marinho — vetorizado a partir de um bitmap de 317×233 px e depois regularizado (ângulo único, braços iguais, canal de largura constante, junções tangentes). Este pacote contém os SVGs finais, um componente React de referência e as regras de uso.

## About the Design Files
`LY Logo Vetorizado.dc.html` é uma **página de referência criada em HTML** (apresentação do logo, variantes, testes de escala, histórico das rodadas). Não é código de produção. O que deve entrar no codebase são os **SVGs em `svg/`** (ou o componente `LYLogo.jsx`, adaptado ao framework do projeto — React, Vue, SwiftUI, etc.). Os caminhos (`<path d>`) são a fonte da verdade e devem ser copiados literalmente.

## Fidelity
**High-fidelity.** Geometria final com precisão de 0,01 unidade; cores finais. Reproduzir exatamente — não redesenhar, não "limpar" os decimais, não trocar curvas por retas.

## Geometria (unidades do viewBox)
- viewBox: `10 -6.5 319.75 251` → área total 319,75 × 251, com respiro de 38 un. (= 1 haste) em todos os lados do desenho (bbox do desenho: x 48→291,75, y 31,5→206,5).
- Haste do L e haste do Y: 38 un. de largura. Altura das letras: 175 un. Topo y=31,5 · base y=206,5.
- Y: ângulo único de 32° em relação à vertical (inclinação 5:8, dx/dy = 0,625). Braços com 42 un. de largura horizontal (35,6 un. perpendicular — 6% mais finos que a haste, correção óptica intencional).
- Pé do L: 32 un. de altura (16% mais fino que a haste, óptico), termina em x=168,5.
- Sistema de "ar" (ritmo 1 : 2 : 4): canal braço→haste 9,5 un. (¼ haste) · folga pé do L→haste do Y 19 un. (½ haste) · respiro externo 38 un. (1 haste).
- Canal: largura **perpendicular constante** do início à ponta; a borda direita do braço esquerdo é a curva paralela (offset) da borda interna da haste.
- Junções braço→haste em curva tangente: esquerda de y=114 a y=152 (controle 187,5 / 131,1); direita de y=124 a y=152 (controle 225,5 / 137,5). Haste reta a partir de y=152 nos dois lados.
- Ponta do braço esquerdo: chanfro de 2 un. (evita entupir em bordado, corte e tamanhos pequenos).

## Paths (copiar literalmente)
```
L        M48 31.5H86V174.5H168.5V206.5H48Z
Y braço  M121.25 31.5H163.25L193.4 79.74Q200.9 91.74 193.4 103.74L190.15 108.96C188.16 112.14 184.72 117.32 182.09 125.92L180.4 126.14Z
Y haste  M249.75 31.5H291.75L233.94 124Q225.5 137.5 225.5 152V206.5H187.5V152Q187.5 131.1 198.2 114Z
Y braço compacto (versão 2c)  M121.25 31.5H163.25L187.8 70.78Q195.3 82.78 187.8 94.78L182.09 103.92C178.65 109.43 176.61 113.85 175.85 115.71L173.98 115.87Z
```
Ordem de desenho: fundo (opcional) → L → braço → haste. Fills sem stroke.

## Design Tokens
- `--ly-navy: #13356A` — fundo / L na versão para fundo claro / monocromática.
- `--ly-amber: #E09A04` — Y sobre navy (contraste 5,0:1).
- `--ly-amber-dark: #B07600` — Y sobre fundos claros (3,9:1 sobre branco). **Nunca** usar #E09A04 sobre branco (2,4:1).
- `--ly-white: #FFFFFF` — L sobre navy (11,5:1).

## Variantes e regras de uso
- `ly-logo.svg` — principal, sobre navy (fundo incluído).
- `ly-logo-transparente.svg` — L branco + Y âmbar, para fundos escuros da marca.
- `ly-logo-fundo-claro.svg` — L navy + Y âmbar escuro, para fundos brancos/claros.
- `ly-logo-mono-navy.svg` / `ly-logo-mono-branco.svg` — uma cor (impressão, gravação, marca d'água).
- `ly-logo-compacto*.svg` — versão 2c, canal de 19 un.: **usar apenas abaixo de 32 px de altura** (favicon, ícone de app, avatar). Acima disso, usar a principal.
- Não distorcer, não rotacionar, não alterar as cores fora dos tokens, não remover o canal.
- Preservar o respiro de 38 un. (o viewBox já o inclui). Para ícones quadrados, centralizar o bbox do desenho (centro 169,875 / 119) num quadrado e manter raio de canto do container ≤ 50% do tamanho.

## Interactions & Behavior
Nenhuma. Ativo estático. Em HTML, usar `<img>` ou SVG inline com `role="img"` e `aria-label="LY"`.

## Assets
- `svg/` — 7 SVGs finais (fonte da verdade).
- `LYLogo.jsx` — componente React de referência (props: variant, compact, background, height).
- `assets/comparacao.png` — original × traçado fiel × mapa de diferença (histórico).
- `uploads/pasted-1789230859414-0.png` — bitmap original de onde o vetor foi medido.

## Files
- `LY Logo Vetorizado.dc.html` — página de referência (hero, variantes, testes de escala, ícone, cores, histórico das rodadas 2a/2b/2c, código SVG).

---

## No Lymark: como os PNGs de `assets/images/` são gerados

Os ícones do app (`icon.png`, `android-icon-foreground.png`,
`android-icon-background.png`, `android-icon-monochrome.png`,
`splash-icon.png`, `favicon.png`) são rasterizados **destes SVGs** — nunca
desenhados à mão. O antigo `scripts/render-app-icon.js`, que desenhava o selo
"L com barra" em código, foi aposentado por isso: rodá-lo regeneraria a marca
antiga.

Receita (12/09/2026): servir esta pasta num servidor local, carregar o SVG num
`<img>` e desenhar num `<canvas>` com `drawImage`, centrando a bbox do desenho
(x 48→291,75 · y 31,5→206,5 no viewBox `10 -6.5 319.75 251`):

| Arquivo | Fonte | Tamanho | Largura da marca | Fundo |
|---|---|---|---|---|
| `icon.png` | `ly-logo-transparente.svg` | 1024 | 62 % | `#13356A` |
| `android-icon-foreground.png` | `ly-logo-transparente.svg` | 1024 | 54 % (zona segura de 66 %) | transparente |
| `android-icon-background.png` | — | 1024 | — | `#13356A` |
| `android-icon-monochrome.png` | `ly-logo-transparente.svg` | 1024 | 54 % | transparente, marca branca |
| `splash-icon.png` | `ly-logo-transparente.svg` | 512 | 78 % | transparente (o app.json põe o marinho) |
| `favicon.png` | `ly-logo-compacto-transparente.svg` | 64 | 76 % | `#13356A` |

`canvas.toBlob('image/png')` sem compressão extra. Quando houver uma
ferramenta de linha de comando no projeto (`resvg`, `sharp`), esta receita
vira script.
