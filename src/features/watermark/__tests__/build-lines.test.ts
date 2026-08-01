import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkLines } from '../build-lines';
import { DEFAULT_WATERMARK_PREFERENCES } from '../preferences';

/**
 * Esta função decide o que fica impresso na foto. É a regra mais sensível do
 * app: um erro aqui não dá tela vermelha, apenas produz uma foto errada que
 * o usuário só descobre depois.
 */
const metadata: CaptureMetadata = {
  time: '11:04',
  date: '01 ago. 2026',
  weekday: 'Sáb',
  address: 'Av. Manoel Domingos Cravo, 257 - Jardim Nancy, Guarujá - SP',
  code: '98926A73655DC1',
};

function withFields(
  visible: Partial<WatermarkPreferences['visibleFields']>,
): WatermarkPreferences {
  return {
    ...DEFAULT_WATERMARK_PREFERENCES,
    visibleFields: { ...DEFAULT_WATERMARK_PREFERENCES.visibleFields, ...visible },
  };
}

describe('buildWatermarkLines', () => {
  it('mantém a ordem declarada dos campos', () => {
    expect(buildWatermarkLines(metadata, DEFAULT_WATERMARK_PREFERENCES)).toEqual([
      '11:04',
      '01 ago. 2026',
      'Sáb',
      'Av. Manoel Domingos Cravo, 257 - Jardim Nancy, Guarujá - SP',
      'Cód. 98926A73655DC1',
    ]);
  });

  it('omite os campos desligados nas preferências', () => {
    const lines = buildWatermarkLines(
      metadata,
      withFields({ weekday: false, address: false }),
    );

    expect(lines).toEqual(['11:04', '01 ago. 2026', 'Cód. 98926A73655DC1']);
  });

  it('não gera linha em branco para campo vazio', () => {
    const lines = buildWatermarkLines(
      { ...metadata, address: '' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(lines).not.toContain('');
    expect(lines).toHaveLength(4);
  });

  it('trata campo só com espaços como vazio', () => {
    const lines = buildWatermarkLines(
      { ...metadata, address: '    ' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(lines).toHaveLength(4);
  });

  it('prefixa o código, que sozinho seria críptico', () => {
    const lines = buildWatermarkLines(metadata, withFields({ time: false, date: false, weekday: false, address: false }));

    expect(lines).toEqual(['Cód. 98926A73655DC1']);
  });

  it('devolve lista vazia quando nada está ligado — foto sai sem carimbo', () => {
    const lines = buildWatermarkLines(
      metadata,
      withFields({ time: false, date: false, weekday: false, address: false, code: false }),
    );

    expect(lines).toEqual([]);
  });
});
