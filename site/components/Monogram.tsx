/**
 * O monograma "LY" da marca, em SVG embutido.
 *
 * Os caminhos são os do pacote `assets/brand/` (fonte da verdade, copiados
 * literalmente — ver o README de lá). Embutido, e não `<img>`, para não
 * custar uma requisição no cabeçalho de toda página e para herdar o tamanho
 * do texto ao lado: a altura é `1.5em`, então o monograma acompanha o
 * tamanho do wordmark onde quer que ele esteja.
 *
 * Cores do pacote da marca: branco no L, âmbar #E09A04 no Y — sobre o
 * marinho do site.
 */
export function Monogram({ size = '1.5em' }: { size?: string }) {
  return (
    <svg
      viewBox="10 -6.5 319.75 251"
      style={{ height: size, width: 'auto', verticalAlign: 'middle', marginInlineEnd: '0.45em' }}
      role="img"
      aria-label="LY"
    >
      <path d="M48 31.5H86V174.5H168.5V206.5H48Z" fill="#FFFFFF" />
      <path
        d="M121.25 31.5H163.25L193.4 79.74Q200.9 91.74 193.4 103.74L190.15 108.96C188.16 112.14 184.72 117.32 182.09 125.92L180.4 126.14Z"
        fill="#E09A04"
      />
      <path
        d="M249.75 31.5H291.75L233.94 124Q225.5 137.5 225.5 152V206.5H187.5V152Q187.5 131.1 198.2 114Z"
        fill="#E09A04"
      />
    </svg>
  );
}
