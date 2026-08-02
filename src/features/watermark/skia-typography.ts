/**
 * Tipografia do carimbo medida dentro do próprio Skia.
 *
 * Nenhum número aqui é estimativa. Todos saem de `scripts/measure-skia-typography.js`,
 * que carrega o `canvaskit-wasm` — o mesmo Skia que roda no aparelho, compilado
 * para WASM —, desenha o texto com as fontes reais e lê os pixels para achar a
 * caixa de tinta. Rode o script de novo sempre que a fonte da hora mudar.
 */

/**
 * Onde a tinta dos algarismos começa, a partir da linha de base, em frações
 * do corpo. Negativo porque em Skia o eixo y cresce para baixo.
 *
 * Medido sobre `0123456789`, e **não** sobre o horário exibido, por um motivo
 * concreto: nesta fonte o algarismo 1 é mais baixo que os demais — `11:11`
 * mede 0,700 de altura contra 0,730 de `07:42`. Ancorar no texto exibido faria
 * a barra âmbar mudar de tamanho conforme o relógio andasse.
 */
export const DIGIT_INK_TOP_FROM_BASELINE = -0.715;

/** Altura da tinta dos algarismos, em frações do corpo. */
export const DIGIT_INK_HEIGHT = 0.73;

/**
 * Corpo da hora como fração da **largura da imagem**, e não em pontos de tela.
 *
 * É a constante central da Fase A. Deriva do alvo medido na referência — a
 * hora ocupa 219 px numa imagem normalizada a 1128 px — combinado com a
 * largura que o Skia dá a `21:55` neste corpo (1,468 × corpo):
 *
 *     (219 / 1128) / 1,468 = 0,13225
 *
 * Expresso assim, o carimbo tem a mesma proporção em qualquer destino: um
 * preview de 360 px e um arquivo de 4000 px.
 */
export const TIME_SIZE_RATIO_MEDIUM = 0.13225;

/**
 * A largura de preview que os valores em pontos de `SCALE_METRICS` implicam.
 *
 *     47 / 0,13225 = 355,4
 *
 * Isto **corrige** uma suposição anterior de 330 px, que vinha de tratar o
 * quadro como um retrato 3:4 exato. A consequência não é cosmética: como
 * `SCALE_METRICS` está em pontos e a moldura ocupa toda a largura da tela, hoje
 * o tamanho do carimbo em relação à foto depende do aparelho. Dois técnicos com
 * telefones de larguras diferentes exportam carimbos de proporções diferentes
 * para a mesma foto. Ancorar na largura da imagem elimina isso.
 */
export const REFERENCE_FRAME_WIDTH = 355.4;
