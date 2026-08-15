import {
  FREE_MONTHLY_QUOTA,
  OFFLINE_TOLERANCE_DAYS,
  applyServerResponse,
  evaluateAccess,
  recordExport,
} from '../access';
import type { Entitlement, LocalLease } from '../types';

/**
 * As regras de acesso decidem se alguém em cima de um telhado consegue
 * carimbar a foto que veio fazer. Por isso o que estes testes mais vigiam não
 * é a cobrança — é a promessa de nunca trancar quem está em campo.
 *
 * O agora entra por parâmetro em toda a API, então cada borda de data é
 * exercitada aqui sem esperar quinze dias.
 */

const DAY = 24 * 60 * 60 * 1000;
const AGORA = Date.parse('2026-09-15T12:00:00.000Z');

function entitlement(over: Partial<Entitlement> = {}): Entitlement {
  return {
    plan: 'pro',
    quota: null,
    used: 0,
    periodEnd: '2026-10-01T00:00:00.000Z',
    validUntil: '2026-09-30T00:00:00.000Z',
    issuedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

/**
 * `entitlement` aceita um pedaço e completa o resto — então
 * `lease({ entitlement: { validUntil: ... } })` mantém os demais campos.
 *
 * A ordem aqui importa: espalhar `over` **depois** de montar o entitlement
 * substituiria o objeto inteiro pelo pedaço, e o teste passaria a exercitar
 * um documento sem plano. Foi exatamente o que aconteceu na primeira versão.
 */
function lease(over: Partial<Omit<LocalLease, 'entitlement'>> & {
  entitlement?: Partial<Entitlement>;
} = {}): LocalLease {
  const { entitlement: parcial, ...resto } = over;

  return {
    spentOffline: 0,
    serverTimeSeen: '2026-09-01T00:00:00.000Z',
    ...resto,
    entitlement: entitlement(parcial),
  };
}

describe('evaluateAccess — a promessa de nunca trancar', () => {
  it('libera quem nunca sincronizou, com a cota grátis inteira', () => {
    const estado = evaluateAccess(null, AGORA);

    expect(estado.canExport).toBe(true);
    expect(estado.plan).toBe('free');
    expect(estado.remaining).toBe(FREE_MONTHLY_QUOTA);
  });

  it('nunca bloqueia um assinante, em nenhum dos estados', () => {
    const vencido = lease({ entitlement: { validUntil: '2026-09-01T00:00:00.000Z' } });
    const forcado = lease({ serverTimeSeen: '2026-12-01T00:00:00.000Z' });

    for (const caso of [lease(), vencido, forcado]) {
      expect(evaluateAccess(caso, AGORA).canExport).toBe(true);
    }
  });

  it('rebaixa para o plano grátis em vez de bloquear, quando a tolerância acaba', () => {
    // Vencido há mais tempo do que a tolerância cobre.
    const muitoVencido = lease({
      entitlement: { validUntil: new Date(AGORA - (OFFLINE_TOLERANCE_DAYS + 1) * DAY).toISOString() },
    });

    const estado = evaluateAccess(muitoVencido, AGORA);

    expect(estado.reason).toBe('expired');
    expect(estado.plan).toBe('free');
    expect(estado.canExport).toBe(true);
    expect(estado.remaining).toBe(FREE_MONTHLY_QUOTA);
  });
});

describe('evaluateAccess — os três estados de validade', () => {
  it('documento dentro da validade é válido e não avisa nada', () => {
    const estado = evaluateAccess(lease(), AGORA);

    expect(estado.reason).toBe('valid');
    expect(estado.plan).toBe('pro');
    expect(estado.shouldWarn).toBe(false);
  });

  it('vencido há poucos dias segue valendo, com aviso', () => {
    const recemVencido = lease({
      entitlement: { validUntil: new Date(AGORA - 3 * DAY).toISOString() },
    });

    const estado = evaluateAccess(recemVencido, AGORA);

    expect(estado.reason).toBe('tolerated');
    expect(estado.plan).toBe('pro');
    expect(estado.shouldWarn).toBe(true);
  });

  it('a fronteira da tolerância é inclusiva', () => {
    const vencimento = new Date(AGORA - OFFLINE_TOLERANCE_DAYS * DAY).toISOString();
    const noLimite = lease({ entitlement: { validUntil: vencimento } });

    expect(evaluateAccess(noLimite, AGORA).reason).toBe('tolerated');
    // Um milissegundo além, e cai.
    expect(evaluateAccess(noLimite, AGORA + 1).reason).toBe('expired');
  });

  it('a viagem de quinze dias não muda nada, porque a validade não chegou ao fim', () => {
    // Assinatura vale até 30/09; a pessoa passa 05 a 20/09 sem sinal.
    const emViagem = Date.parse('2026-09-20T12:00:00.000Z');

    const estado = evaluateAccess(lease(), emViagem);

    expect(estado.reason).toBe('valid');
    expect(estado.shouldWarn).toBe(false);
  });

  it('trata documento com data ilegível como vencido, e não como válido', () => {
    const corrompido = lease({ entitlement: { validUntil: 'nao-e-uma-data' } });

    const estado = evaluateAccess(corrompido, AGORA);

    expect(estado.reason).toBe('expired');
    expect(estado.canExport).toBe(true);
  });
});

describe('evaluateAccess — relógio adulterado', () => {
  it('acusa quando o aparelho está atrás do último horário visto do servidor', () => {
    const adiantado = lease({ serverTimeSeen: new Date(AGORA + DAY).toISOString() });

    expect(evaluateAccess(adiantado, AGORA).reason).toBe('clock-tampered');
  });

  it('atrasar o relógio não estica a assinatura: rebaixa para o plano grátis', () => {
    // O truque seria voltar a data para antes do vencimento e seguir como pro.
    const truque = lease({
      entitlement: { plan: 'pro', validUntil: '2026-09-30T00:00:00.000Z' },
      serverTimeSeen: '2026-10-05T00:00:00.000Z',
    });

    const estado = evaluateAccess(truque, Date.parse('2026-09-10T00:00:00.000Z'));

    expect(estado.reason).toBe('clock-tampered');
    expect(estado.plan).toBe('free');
    // E mesmo assim continua exportando, dentro da cota grátis.
    expect(estado.canExport).toBe(true);
  });
});

describe('cota do plano grátis', () => {
  it('desconta o que o servidor contabilizou e o que foi gasto offline', () => {
    const usado = lease({
      entitlement: { plan: 'free', quota: 15, used: 4 },
      spentOffline: 2,
    });

    expect(evaluateAccess(usado, AGORA).remaining).toBe(9);
  });

  it('é o único caminho que impede a exportação', () => {
    const esgotado = lease({ entitlement: { plan: 'free', quota: 15, used: 15 } });

    const estado = evaluateAccess(esgotado, AGORA);

    expect(estado.remaining).toBe(0);
    expect(estado.canExport).toBe(false);
  });

  it('nunca reporta saldo negativo, mesmo se o offline estourou a cota', () => {
    // Acontece de propósito: offline nós honramos as fotos e ajustamos depois.
    const estourado = lease({
      entitlement: { plan: 'free', quota: 15, used: 10 },
      spentOffline: 40,
    });

    expect(evaluateAccess(estourado, AGORA).remaining).toBe(0);
  });

  it('não herda a contagem de um documento pago que foi rebaixado', () => {
    // `used: 900` é de exportações no plano pago, onde não há teto. Herdá-lo
    // ao cair para o plano grátis daria saldo zero a quem nunca gastou nada
    // como usuário grátis.
    const rebaixado = lease({
      entitlement: {
        plan: 'pro',
        quota: null,
        used: 900,
        validUntil: new Date(AGORA - 90 * DAY).toISOString(),
      },
    });

    const estado = evaluateAccess(rebaixado, AGORA);

    expect(estado.plan).toBe('free');
    expect(estado.remaining).toBe(FREE_MONTHLY_QUOTA);
  });

  it('o plano pago não tem teto', () => {
    const estado = evaluateAccess(lease(), AGORA);

    expect(estado.remaining).toBeNull();
    expect(estado.quota).toBeNull();
  });

  it('expõe a cota junto do restante, para a interface mostrar a fração', () => {
    // Deduzir o teto somando o que foi gasto daria número errado assim que um
    // documento pago fosse rebaixado — daí a cota vir pronta.
    const usado = lease({ entitlement: { plan: 'free', quota: 15, used: 4 }, spentOffline: 2 });
    const estado = evaluateAccess(usado, AGORA);

    expect(`${estado.remaining}/${estado.quota}`).toBe('9/15');
  });

  it('o rebaixado mostra a cota grátis, e não a do documento pago', () => {
    const rebaixado = lease({
      entitlement: {
        plan: 'pro',
        quota: null,
        used: 900,
        validUntil: new Date(AGORA - 90 * DAY).toISOString(),
      },
    });
    const estado = evaluateAccess(rebaixado, AGORA);

    expect(`${estado.remaining}/${estado.quota}`).toBe(`${FREE_MONTHLY_QUOTA}/${FREE_MONTHLY_QUOTA}`);
  });
});

describe('recordExport', () => {
  it('soma ao gasto offline sem tocar no que veio do servidor', () => {
    const antes = lease({ entitlement: { plan: 'free', quota: 15, used: 3 } });
    const depois = recordExport(antes);

    expect(depois.spentOffline).toBe(1);
    expect(depois.entitlement.used).toBe(3);
    expect(antes.spentOffline).toBe(0);
  });

  it('não recusa quando a cota já acabou', () => {
    // A recusa é da camada de cima, que consulta `canExport`. Aqui, uma foto
    // que chegou a ser carimbada é sempre contabilizada.
    const esgotado = lease({ entitlement: { plan: 'free', quota: 15, used: 15 } });

    expect(recordExport(esgotado).spentOffline).toBe(1);
  });
});

describe('applyServerResponse', () => {
  it('zera o gasto offline, porque a resposta já o inclui', () => {
    const acumulado = lease({ spentOffline: 7 });
    const novo = applyServerResponse(acumulado, entitlement({ used: 7, issuedAt: '2026-09-15T12:00:00.000Z' }));

    expect(novo.spentOffline).toBe(0);
    expect(novo.entitlement.used).toBe(7);
  });

  it('adota o horário do servidor como referência', () => {
    const novo = applyServerResponse(null, entitlement({ issuedAt: '2026-09-15T12:00:00.000Z' }));

    expect(novo.serverTimeSeen).toBe('2026-09-15T12:00:00.000Z');
  });

  it('o horário visto só anda para frente', () => {
    // Um servidor que voltasse atrás — troca de instância, correção de NTP —
    // não pode desarmar a proteção contra relógio adulterado no aparelho.
    const jaViuMaisTarde = lease({ serverTimeSeen: '2026-10-01T00:00:00.000Z' });
    const novo = applyServerResponse(jaViuMaisTarde, entitlement({ issuedAt: '2026-09-15T12:00:00.000Z' }));

    expect(novo.serverTimeSeen).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('o ciclo completo', () => {
  it('gasta offline, reconcilia e continua com a conta certa', () => {
    let atual = lease({ entitlement: { plan: 'free', quota: 15, used: 0 } });

    // Um dia de campo, sem sinal.
    for (let i = 0; i < 5; i += 1) atual = recordExport(atual);
    expect(evaluateAccess(atual, AGORA).remaining).toBe(10);

    // De volta à cidade: o servidor confirma as cinco.
    atual = applyServerResponse(
      atual,
      entitlement({ plan: 'free', quota: 15, used: 5, issuedAt: '2026-09-15T18:00:00.000Z' }),
    );

    // O saldo não pode ter caído para 5 — seria contar as mesmas fotos duas vezes.
    expect(evaluateAccess(atual, AGORA).remaining).toBe(10);
  });
});
