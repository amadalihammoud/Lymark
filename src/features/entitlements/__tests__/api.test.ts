import { fetchEntitlement, parseEntitlement } from '../api';
import type { Entitlement } from '../types';

/**
 * A rede em campo não é a rede do escritório. Portal de Wi-Fi devolvendo
 * HTML, proxy respondendo erro em texto, resposta que nunca chega — os três
 * acontecem, e nenhum deles pode derrubar a tela de captura nem substituir um
 * documento válido por lixo.
 *
 * Estes testes exercitam exatamente esses casos, sem servidor de pé.
 */

const VALIDO: Entitlement = {
  plan: 'pro',
  quota: null,
  used: 0,
  periodEnd: '2026-10-01T00:00:00.000Z',
  validUntil: '2026-09-30T00:00:00.000Z',
  issuedAt: '2026-09-01T00:00:00.000Z',
};

/** Um `fetch` de mentira que devolve o que o teste mandar. */
function servidorFalso(
  resposta: Partial<Response> & { corpo?: unknown; lancaAoLerCorpo?: boolean },
): typeof fetch {
  return (async () =>
    ({
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => {
        if (resposta.lancaAoLerCorpo) throw new SyntaxError('token inesperado <');
        return resposta.corpo;
      },
    }) as Response) as unknown as typeof fetch;
}

const pedido = (fetchImpl: typeof fetch, timeoutMs?: number) =>
  fetchEntitlement({ endpoint: 'https://exemplo/api/entitlements', token: 't', fetchImpl, timeoutMs });

describe('parseEntitlement', () => {
  it('aceita um corpo íntegro', () => {
    expect(parseEntitlement({ ...VALIDO })).toEqual(VALIDO);
  });

  it('aceita quota nula, que é ausência de teto e não ausência de valor', () => {
    expect(parseEntitlement({ ...VALIDO, quota: null })?.quota).toBeNull();
  });

  it.each([
    ['plano desconhecido', { plan: 'enterprise' }],
    ['quota ausente', { quota: undefined }],
    ['quota fracionária', { quota: 1.5 }],
    ['quota negativa', { quota: -1 }],
    ['used ausente', { used: undefined }],
    ['used como texto', { used: '3' }],
    ['data ilegível', { validUntil: 'ontem' }],
    ['data vazia', { issuedAt: '' }],
    ['periodEnd ausente', { periodEnd: undefined }],
  ])('recusa corpo com %s', (_nome, remendo) => {
    expect(parseEntitlement({ ...VALIDO, ...remendo })).toBeNull();
  });

  it.each([
    ['nulo', null],
    ['texto', 'ok'],
    ['número', 42],
    ['lista', []],
  ])('recusa corpo que é %s', (_nome, corpo) => {
    expect(parseEntitlement(corpo)).toBeNull();
  });

  it('recusa uma página HTML, que é o que portal de Wi-Fi devolve', () => {
    expect(parseEntitlement('<!DOCTYPE html><html>Faça login na rede</html>')).toBeNull();
  });
});

describe('fetchEntitlement', () => {
  it('devolve o entitlement quando o servidor responde direito', async () => {
    const r = await pedido(servidorFalso({ corpo: VALIDO }));

    expect(r.status).toBe('ok');
    expect(r.status === 'ok' && r.entitlement).toEqual(VALIDO);
  });

  it('trata sem rede como inalcançável, e não como erro', async () => {
    const semRede = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    expect((await pedido(semRede)).status).toBe('unreachable');
  });

  it('desiste quando a resposta demora demais', async () => {
    // Um `fetch` que respeita o sinal de aborto, como o real.
    const lento = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
      })) as unknown as typeof fetch;

    const r = await pedido(lento, 10);

    expect(r.status).toBe('unreachable');
  });

  it('sessão expirada pede login de novo', async () => {
    expect((await pedido(servidorFalso({ ok: false, status: 401 }))).status).toBe('unauthorized');
    expect((await pedido(servidorFalso({ ok: false, status: 403 }))).status).toBe('unauthorized');
  });

  it('erro do servidor não derruba a sessão: vira inalcançável', async () => {
    // 500 é defeito nosso. Derrubar o login de quem está em campo por causa
    // dele seria punir a pessoa errada.
    const r = await pedido(servidorFalso({ ok: false, status: 503 }));

    expect(r.status).toBe('unreachable');
  });

  it('separa erro de cliente, que é defeito nosso e merece registro', async () => {
    const r = await pedido(servidorFalso({ ok: false, status: 404 }));

    expect(r.status).toBe('invalid');
    expect(r.status === 'invalid' && r.detail).toContain('404');
  });

  it('recusa corpo que não é JSON', async () => {
    const r = await pedido(servidorFalso({ lancaAoLerCorpo: true }));

    expect(r.status).toBe('invalid');
    expect(r.status === 'invalid' && r.detail).toBe('corpo não é JSON');
  });

  it('recusa JSON fora do contrato', async () => {
    const r = await pedido(servidorFalso({ corpo: { plan: 'pro' } }));

    expect(r.status).toBe('invalid');
    expect(r.status === 'invalid' && r.detail).toBe('corpo fora do contrato');
  });

  it('nunca lança, aconteça o que acontecer', async () => {
    const caotico = (async () => {
      throw { nem: 'um Error de verdade' };
    }) as unknown as typeof fetch;

    await expect(pedido(caotico)).resolves.toMatchObject({ status: 'unreachable' });
  });

  it('envia o token no cabeçalho', async () => {
    let visto: RequestInit | undefined;
    const espiao = (async (_url: string, init?: RequestInit) => {
      visto = init;
      return { ok: true, status: 200, json: async () => VALIDO } as Response;
    }) as unknown as typeof fetch;

    await fetchEntitlement({ endpoint: 'https://exemplo/api', token: 'abc123', fetchImpl: espiao });

    expect((visto?.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });
});
