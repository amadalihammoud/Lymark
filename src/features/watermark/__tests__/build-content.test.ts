import type { CaptureMetadata, WatermarkPreferences } from '@/types';

import { buildWatermarkContent } from '../build-content';
import { DEFAULT_WATERMARK_PREFERENCES } from '../preferences';

/**
 * Esta função decide o que fica impresso na foto. É a regra mais sensível do
 * app: um erro aqui não dá tela vermelha, apenas produz uma foto errada que
 * o usuário só descobre depois.
 */
const metadata: CaptureMetadata = {
  time: '14:38',
  date: '30 jul. 2026',
  weekday: 'Qui',
  address: 'R. Azuíl Loureiro, 1395 - Vila Santa Rosa, Guarujá - SP, 11430-111',
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

describe('buildWatermarkContent', () => {
  it('devolve cada campo no seu papel', () => {
    const content = buildWatermarkContent(metadata, DEFAULT_WATERMARK_PREFERENCES);

    expect(content.time).toBe('14:38');
    expect(content.date).toBe('30 jul. 2026');
    expect(content.weekday).toBe('Qui');
    expect(content.address).toContain('Azuíl Loureiro');
    expect(content.code).toBe('98926A73655DC1');
    expect(content.isEmpty).toBe(false);
  });

  it('anula os campos desligados nas preferências', () => {
    const content = buildWatermarkContent(metadata, withFields({ code: false, weekday: false }));

    expect(content.code).toBeNull();
    expect(content.weekday).toBeNull();
    expect(content.time).toBe('14:38');
  });

  it('trata campo vazio como ausente', () => {
    const content = buildWatermarkContent(
      { ...metadata, address: '' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.address).toBeNull();
  });

  it('trata campo só com espaços como ausente', () => {
    const content = buildWatermarkContent(
      { ...metadata, address: '   ' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.address).toBeNull();
  });

  it('remove espaços das bordas do valor exibido', () => {
    const content = buildWatermarkContent(
      { ...metadata, time: '  14:38  ' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.time).toBe('14:38');
  });
});

describe('barra âmbar separadora', () => {
  it('aparece quando há hora de um lado e data ou dia do outro', () => {
    expect(buildWatermarkContent(metadata, DEFAULT_WATERMARK_PREFERENCES).showRule).toBe(true);

    expect(
      buildWatermarkContent(metadata, withFields({ date: false })).showRule,
    ).toBe(true);
  });

  it('some quando a hora sai — não sobra risco solto sobre a foto', () => {
    expect(buildWatermarkContent(metadata, withFields({ time: false })).showRule).toBe(false);
  });

  it('some quando não há data nem dia da semana', () => {
    const content = buildWatermarkContent(
      metadata,
      withFields({ date: false, weekday: false }),
    );

    expect(content.showRule).toBe(false);
    expect(content.time).toBe('14:38');
  });

  it('some quando a hora está ligada mas vazia', () => {
    const content = buildWatermarkContent(
      { ...metadata, time: '' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.showRule).toBe(false);
  });
});

describe('carimbo vazio', () => {
  it('marca isEmpty quando nada está ligado', () => {
    const content = buildWatermarkContent(
      metadata,
      withFields({ time: false, date: false, weekday: false, address: false, code: false }),
    );

    expect(content.isEmpty).toBe(true);
  });

  it('marca isEmpty quando tudo está ligado mas sem conteúdo', () => {
    const content = buildWatermarkContent(
      { time: '', date: '', weekday: '', address: '', code: '' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.isEmpty).toBe(true);
  });

  it('não marca isEmpty se sobrou um único campo', () => {
    const content = buildWatermarkContent(
      { ...metadata, time: '', date: '', weekday: '', address: '' },
      DEFAULT_WATERMARK_PREFERENCES,
    );

    expect(content.isEmpty).toBe(false);
    expect(content.code).toBe('98926A73655DC1');
  });
});
