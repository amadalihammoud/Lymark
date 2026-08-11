/**
 * O maior retângulo com a proporção pedida que cabe na caixa.
 *
 * Mora em módulo próprio, e não junto do componente, porque o componente
 * importa o Skia — o que impediria testá-la fora do navegador.
 *
 * O cálculo é feito aqui, e não por CSS, porque `aspectRatio` sozinho resolve a
 * altura a partir da largura e ignora o teto vertical: numa janela larga o
 * quadro passava de mil e seiscentos pixels de altura.
 *
 * O resultado não é só estilo. É também o tamanho entregue ao `StampCanvas`,
 * que devolve `null` se receber zero — e aí a foto aparece sem carimbo, sem
 * erro e sem aviso.
 */
export type Size = { width: number; height: number };

export function fitInside(box: Size, aspectRatio: number): Size {
  if (box.width <= 0 || box.height <= 0) return { width: 0, height: 0 };

  const heightIfFullWidth = box.width / aspectRatio;
  return heightIfFullWidth <= box.height
    ? { width: box.width, height: heightIfFullWidth }
    : { width: box.height * aspectRatio, height: box.height };
}
