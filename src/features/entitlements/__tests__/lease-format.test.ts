import { parseLease } from '../lease-format';
import type { Entitlement } from '../types';

/**
 * O disco guarda o que uma versão anterior do aplicativo escreveu. Formato
 * que mudou, gravação interrompida, arquivo adulterado — os três chegam aqui,
 * e nenhum deles pode virar um saldo inventado.
 */

const ENTITLEMENT: Entitlement = {
  plan: 'free',
  quota: 15,
  used: 4,
  periodEnd: '2026-10-01T00:00:00.000Z',
  validUntil: '2026-09-30T00:00:00.000Z',
  issuedAt: '2026-09-01T00:00:00.000Z',
};

const GRAVADO = {
  entitlement: ENTITLEMENT,
  spentOffline: 2,
  serverTimeSeen: '2026-09-01T00:00:00.000Z',
};

describe('parseLease', () => {
  it('reconstrói um lote íntegro', () => {
    expect(parseLease(GRAVADO)).toEqual(GRAVADO);
  });

  it.each([
    ['nulo', null],
    ['texto', 'lote'],
    ['lista', []],
    ['sem entitlement', { spentOffline: 1 }],
    ['entitlement fora do contrato', { ...GRAVADO, entitlement: { plan: 'free' } }],
  ])('devolve null para %s', (_nome, valor) => {
    expect(parseLease(valor)).toBeNull();
  });

  it.each([
    ['negativo', -3],
    ['fracionário', 1.5],
    ['texto', '2'],
    ['ausente', undefined],
  ])('zera o gasto offline quando ele vem %s', (_nome, valor) => {
    // Zero erra a favor do usuário: ele recupera as fotos, em vez de perdê-las
    // por causa de um arquivo corrompido.
    expect(parseLease({ ...GRAVADO, spentOffline: valor })?.spentOffline).toBe(0);
  });

  it('cai no issuedAt quando o horário de servidor não é legível', () => {
    const lote = parseLease({ ...GRAVADO, serverTimeSeen: 'quinta-feira' });

    expect(lote?.serverTimeSeen).toBe(ENTITLEMENT.issuedAt);
  });

  it('preserva um horário de servidor mais recente que o issuedAt', () => {
    // É o que sustenta a proteção contra relógio adulterado entre execuções.
    const lote = parseLease({ ...GRAVADO, serverTimeSeen: '2026-09-20T00:00:00.000Z' });

    expect(lote?.serverTimeSeen).toBe('2026-09-20T00:00:00.000Z');
  });

  it('não aceita um lote de uma versão que gravava o plano solto', () => {
    // Formato hipotético de uma versão anterior. O ponto do teste é que a
    // mudança de formato produz `null` — plano grátis liberado — e nunca um
    // objeto meio montado.
    const antigo = { plan: 'pro', validUntil: '2026-12-01T00:00:00.000Z', spentOffline: 0 };

    expect(parseLease(antigo)).toBeNull();
  });
});
