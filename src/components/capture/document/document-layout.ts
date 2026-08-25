import { fitInside, type Size } from '@/components/capture/fit-inside';

/**
 * A lei de dimensionamento do documento da tela larga.
 *
 * O desenho do v2B é "foto + dados são UM documento": a régua de dados fica
 * colada embaixo da foto, com a largura dela. Isso parece pedir que alguém
 * meça o quadro e informe a largura para a régua — e é exatamente o que NÃO
 * pode ser feito.
 *
 * A razão está em `photo-preview.tsx`: já existiu ali uma medição em cadeia
 * (mede a caixa, dimensiona o quadro, mede o quadro de volta) e ela produzia
 * foto sem carimbo quando a segunda medição não chegava. Aqui seria pior: a
 * régua realimentaria o cálculo do quadro, e como a guarda de igualdade
 * compara floats exatos, um layout que oscile em fração de pixel entra em
 * render contínuo.
 *
 * Então a régua nunca reporta altura para cima. As três alturas abaixo são
 * CONSTANTES DE MÓDULO, reservadas antes de qualquer conta, e a largura da
 * régua é DERIVADA no mesmo passo puro que dimensiona o quadro — a partir de
 * uma medição só.
 */

/** Rótulo (~18) + respiro (8) + caixa de 44: a régua de uma linha. */
export const RULER_HEIGHT = 70;

/** O que separa a foto da régua — perto o bastante para lerem como um só. */
export const RULER_GAP = 12;

/**
 * A linha de dicas abaixo da régua.
 *
 * Reservada SEMPRE, mesmo vazia: se ela só ocupasse espaço quando há um aviso,
 * o quadro mudaria de tamanho ao ligar o GPS ou ao desligar um campo — a foto
 * saltaria sozinha na tela.
 */
export const FOOTER_HEIGHT = 20;

/**
 * A largura mínima de cada célula da régua.
 *
 * Não são estimativas: cada número foi MEDIDO no navegador, com a fonte real
 * da interface, e já inclui os 24 pixels de recuo interno da caixa. O pior
 * caso de cada campo é o que manda, e ele nem sempre é o português —
 * "25. Aug. 2026" do alemão é o mais largo dos formatos de data (130), contra
 * 125 do português e 122 do inglês.
 *
 *   hora    "19:17"           45 + 24 =  69  →  72
 *   data    "25. Aug. 2026"  106 + 24 = 130  →  132
 *   dia     "Qua"             30 + 24 =  54  →   60
 *   código  14 caracteres    138 + 24 = 162  →  164
 *
 * O código é o mais crítico: cortado, ele continua PARECENDO um código
 * inteiro, e quem lê não tem como saber que faltam caracteres. Por isso ele
 * ganha a largura cheia, e não uma capa com seta como o endereço — um
 * identificador ou aparece todo, ou não serve.
 *
 * O endereço é a exceção deliberada: nenhuma largura razoável o comporta, e é
 * ele quem ganha a capa esmaecida com a seta.
 *
 * Moram aqui, e não no componente, porque o piso da régua é a soma deles: os
 * dois números precisam mudar juntos, e o teste garante que mudem.
 */
export const CELL_MIN_WIDTH = {
  time: 72,
  date: 132,
  weekday: 60,
  address: 200,
  code: 164,
} as const;

/** Os três botões da régua — agora, localizar e regenerar. */
export const RULER_BUTTON_SIZE = 44;
const RULER_BUTTON_COUNT = 3;

/** O respiro entre as células, o mesmo `spacing.md` do tema. */
const CELL_GAP = 12;

/**
 * O piso de largura da régua: a soma exata do que ela precisa para caber.
 *
 * Uma foto em pé produz um quadro estreito, e a régua colada a ele viraria
 * cinco campos ilegíveis. Abaixo deste piso a régua deixa de acompanhar a
 * largura da foto e passa a ser mais larga que ela — o documento continua
 * centrado, e a foto fica dentro dele.
 */
export const RULER_MIN_WIDTH =
  Object.values(CELL_MIN_WIDTH).reduce((total, width) => total + width, 0) +
  RULER_BUTTON_COUNT * RULER_BUTTON_SIZE +
  // Sete respiros: cinco células e três botões são oito itens na linha.
  7 * CELL_GAP;

/** Tudo o que fica abaixo da foto e precisa de altura garantida. */
const DOCUMENT_FOOTER = RULER_GAP + RULER_HEIGHT + FOOTER_HEIGHT;

export function documentLayout(
  box: Size,
  aspectRatio: number,
): { frame: Size; documentWidth: number } {
  // O rodapé sai da ALTURA, nunca da largura: é embaixo da foto que ele mora.
  // Caixa mais baixa que o rodapé cai na guarda de `fitInside` e devolve
  // zeros — que é o estado correto antes da primeira medição.
  const frame = fitInside(
    { width: box.width, height: box.height - DOCUMENT_FOOTER },
    aspectRatio,
  );

  const documentWidth =
    frame.width <= 0 ? 0 : Math.min(box.width, Math.max(frame.width, RULER_MIN_WIDTH));

  return { frame, documentWidth };
}
