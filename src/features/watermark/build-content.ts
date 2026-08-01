import type { CaptureMetadata, WatermarkPreferences } from '@/types';

/**
 * Decide o conteúdo do carimbo.
 *
 * Devolve uma estrutura, e não uma lista de linhas, porque a marca d'água do
 * Lymark não é uma pilha de textos iguais: a hora tem peso próprio, data e
 * dia da semana formam um bloco secundário ao lado dela, e o endereço ocupa
 * a largura embaixo. Quem desenha precisa saber qual campo é qual.
 *
 * Um campo entra na foto quando está ligado nas preferências **e** tem valor —
 * campo vazio não vira espaço em branco sobre a imagem.
 */

export type WatermarkContent = {
  /** Hora, em destaque. */
  time: string | null;
  /** Data, no bloco secundário. */
  date: string | null;
  /** Dia da semana, abaixo da data. */
  weekday: string | null;
  address: string | null;
  code: string | null;
  /**
   * A barra âmbar só faz sentido como separador: precisa de conteúdo dos
   * dois lados. Sozinha, seria um risco solto sobre a foto.
   */
  showRule: boolean;
  /** Nada a carimbar — a foto sai limpa. */
  isEmpty: boolean;
};

function resolve(
  value: string,
  visible: boolean,
): string | null {
  if (!visible) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildWatermarkContent(
  metadata: CaptureMetadata,
  preferences: WatermarkPreferences,
): WatermarkContent {
  const { visibleFields } = preferences;

  const time = resolve(metadata.time, visibleFields.time);
  const date = resolve(metadata.date, visibleFields.date);
  const weekday = resolve(metadata.weekday, visibleFields.weekday);
  const address = resolve(metadata.address, visibleFields.address);
  const code = resolve(metadata.code, visibleFields.code);

  return {
    time,
    date,
    weekday,
    address,
    code,
    showRule: time !== null && (date !== null || weekday !== null),
    isEmpty: !time && !date && !weekday && !address && !code,
  };
}
