'use client';

import { cl, eo, lerp, useTimeline } from '../_lib/motion';

/*
 * A tela de captura corrigindo o número que o GPS errou, em laço de 8 s.
 *
 * É a cena que justifica a decisão de projeto mais questionada do aplicativo:
 * por que os campos são editáveis. O GPS devolve 2000, a foto é do 1225, e a
 * correção acontece antes de o carimbo existir — não depois, sobre um arquivo
 * já exportado.
 */

const DUR = 8;

const PREFIX = 'Av. Ana Costa, ';
const SUFFIX = ' - Gonzaga, Santos - SP';
const WRONG = '2000';
const RIGHT = '1225';

function values(t: number) {
  const tapA = cl(0.9, 1.0, t) * (1 - cl(1.0, 1.55, t));
  const tapB = cl(3.8, 3.9, t) * (1 - cl(3.9, 4.4, t));
  const rippleA = cl(0.92, 1.5, t) * (t < 1.6 ? 1 : 0);
  const rippleB = cl(3.82, 4.35, t) * (t > 3.7 && t < 4.45 ? 1 : 0);
  const ringInA = eo(cl(0.15, 0.6, t));
  const ringOutA = cl(3.0, 3.4, t);
  const ringInB = eo(cl(3.4, 3.8, t));

  const searching = t >= 1.05 && t < 2.1;
  const filled = t >= 2.1;
  const selected = t >= 3.85 && t < 4.7;
  const editing = t >= 4.7;

  let num = '';
  if (filled && t < 4.7) num = WRONG;
  else if (editing) {
    const deleted = Math.floor(4 * cl(4.7, 5.25, t));
    const typed = Math.floor(4 * cl(5.45, 6.15, t));
    num = typed > 0 ? RIGHT.slice(0, typed) : WRONG.slice(0, 4 - deleted);
  }

  let caption = 'A foto entra e o endereço começa a ser buscado.';
  if (t >= 6.2) caption = 'O carimbo já sai com o endereço certo.';
  else if (t >= 4.7) caption = 'O campo é editável: você corrige à mão, na tela de captura.';
  else if (t >= 3.85) caption = 'Mas a foto é do 1225 — o número está errado.';
  else if (t >= 2.1) caption = 'O GPS devolveu o número 2000.';
  else if (t >= 1.05) caption = 'Localizando pelo GPS…';

  const stampFlash = cl(6.2, 6.35, t) * (1 - cl(6.35, 7.0, t));

  return {
    wrapOp: 1 - cl(7.45, 7.95, t),
    placeholder: filled ? '' : searching ? 'Localizando' : 'Toque em localizar ou digite o endereço',
    searching,
    prefix: filled ? PREFIX : '',
    suffix: filled ? SUFFIX : '',
    num,
    selected,
    amber: editing && t < 6.25,
    caret: editing && t < 6.2,
    editing,
    filled,
    tapA,
    tapB,
    stampPrefix: filled ? PREFIX : 'buscando endereço…',
    stampSuffix: filled ? ' - Gonzaga,' : '',
    line1Op: filled ? 1 : 0.45,
    line2Op: filled ? 1 : 0,
    stampFlash,
    caption,
    ringScaleA: lerp(1.45, 1, ringInA) - tapA * 0.26 + ringOutA * 0.3,
    ringOpA: ringInA * (1 - ringOutA),
    rippleScaleA: 1 + rippleA * 1.9,
    rippleOpA: rippleA > 0 ? (1 - rippleA) * 0.8 : 0,
    ringScaleB: lerp(1.5, 1, ringInB) - tapB * 0.26,
    ringOpB: ringInB * (1 - cl(6.9, 7.3, t)),
    rippleScaleB: 1 + rippleB * 1.9,
    rippleOpB: rippleB > 0 ? (1 - rippleB) * 0.8 : 0,
  };
}

export function AddressScene() {
  const { t, ref } = useTimeline(DUR, { threshold: 0.45 });
  const v = values(t);

  return (
    <div className="scene" ref={ref}>
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/casa-1225.webp" alt="Fachada de uma casa com o número 1225 ao lado da porta." />
        <div className="scrim" />

        <div className="overlay" style={{ opacity: v.wrapOp }}>
          <div className="stamp-row">
            <p className="stamp-clock">14:08</p>
            <span className="stamp-bar" style={{ transform: 'scaleY(1)' }} />
            <div className="stamp-meta">
              <span>03 ago. 2026</span>
              <span>Seg</span>
            </div>
          </div>
          <p className="stamp-address" style={{ opacity: v.line1Op }}>
            {v.stampPrefix}
            <span
              className="num"
              style={{ background: v.stampFlash > 0.05 ? 'rgba(245, 182, 13, 0.28)' : 'transparent' }}
            >
              {v.num}
            </span>
            {v.stampSuffix}
          </p>
          <p className="stamp-address" style={{ opacity: v.line2Op }}>
            Santos - SP, 11060-002
          </p>
        </div>

      </div>

      <div className="capture">
        <p className="capture-label">Endereço / local</p>
        <div className={v.editing ? "addr-field editing" : "addr-field"}>
          <p className="field-text">
            {v.placeholder ? (
              <span className={v.searching ? 'placeholder searching' : 'placeholder'}>{v.placeholder}</span>
            ) : (
              <>
                {v.prefix}
                <span className={v.selected ? 'num selected' : v.amber ? 'num amber' : 'num'}>{v.num}</span>
                {v.caret ? <span className="caret" /> : null}
                {v.suffix}
              </>
            )}
          </p>
          <span className="locate" style={{ background: v.tapA > 0 ? 'var(--amber)' : undefined }}>
            <span className="ring" style={{ transform: `scale(${v.ringScaleA})`, opacity: v.ringOpA }} />
            <span className="ripple" style={{ transform: `scale(${v.rippleScaleA})`, opacity: v.rippleOpA }} />
          </span>
        </div>
        <p className="scene-caption">{v.caption}</p>
      </div>
    </div>
  );
}
