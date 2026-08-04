'use client';

import { cl, eo, lerp, useTimeline } from '../_lib/motion';

/*
 * O carimbo sendo desenhado sobre uma foto de campo, em laço de 7,5 s.
 *
 * A cena conta a história inteira do aplicativo sem uma linha de texto: a
 * hora aparece, a barra âmbar cresce até a altura da tinta dos algarismos, o
 * endereço é digitado com o número que o GPS devolveu, o número errado é
 * selecionado e trocado à mão, e o código sorteia dígitos até travar.
 *
 * Os instantes são os do desenho original. Eles não são arbitrários: o
 * endereço termina de ser digitado em 3,05 s porque é quando o olho já leu a
 * hora e a data, e a correção começa em 3,45 s porque é o tempo de perceber
 * que o número está errado antes de vê-lo mudar.
 */

const DUR = 7.5;

const CODE = '98926A73655DC1';
const HEX = '0123456789ABCDEF';
const PREFIX = 'Av. Puglisi, ';
const SUFFIX = ' - Centro,';
const LINE2 = 'Guarujá - SP, 11410-002';
const FIELD_SUFFIX = ' - Centro, Guarujá - SP';
const WRONG = '863';
const RIGHT = '490';

function values(t: number) {
  const minutes = Math.round(42 * eo(cl(0.45, 1.35, t)));
  const line1 = PREFIX + WRONG + SUFFIX;
  const typed = Math.floor((line1.length + LINE2.length) * cl(1.6, 3.05, t));

  const selected = t >= 3.45 && t < 3.95;
  let num = typed > PREFIX.length ? WRONG.slice(0, Math.min(typed - PREFIX.length, WRONG.length)) : '';
  if (t >= 3.95) {
    const deleted = Math.floor(3 * cl(3.95, 4.35, t));
    const retyped = Math.floor(3 * cl(4.55, 5.1, t));
    num = retyped > 0 ? RIGHT.slice(0, retyped) : WRONG.slice(0, 3 - deleted);
  }

  /* O código sorteia dígitos antes de travar: é o que ele de fato faz — cada
     foto recebe 14 caracteres de um gerador criptográfico. */
  const locked = Math.floor(CODE.length * cl(5.25, 5.95, t));
  let code = '';
  for (let i = 0; i < CODE.length; i += 1) {
    code += i < locked ? CODE[i] : t > 5.05 ? HEX[(Math.floor(t * 41) + i * 7) % 16] : ' ';
  }

  const fieldTotal = PREFIX.length + WRONG.length + FIELD_SUFFIX.length;
  const fieldTyped = Math.floor(fieldTotal * cl(1.6, 3.05, t));
  const fieldSuffix = fieldTyped - PREFIX.length - WRONG.length;
  const searching = t >= 1.32 && t < 1.68;
  const editing = t >= 3.45 && t < 5.3;
  const tap = cl(1.3, 1.4, t) * (1 - cl(1.4, 1.78, t));
  const ringIn = eo(cl(0.85, 1.3, t));
  const ringOut = cl(1.85, 2.1, t);
  const ripple = t < 2.0 ? cl(1.32, 1.88, t) : 0;

  let caption = 'A foto entra e o endereço começa a ser buscado.';
  if (t >= 5.3) caption = 'O carimbo já sai com o endereço certo.';
  else if (t >= 3.95) caption = 'O campo é editável: você corrige à mão, na tela de captura.';
  else if (t >= 3.45) caption = 'Mas a foto é do 490 — o número está errado.';
  else if (t >= 1.68) caption = 'O GPS devolveu o número 863.';
  else if (t >= 1.32) caption = 'Localizando pelo GPS…';

  return {
    clock: `07:${String(minutes).padStart(2, '0')}`,
    clockOp: cl(0.35, 0.7, t),
    bar: eo(cl(0.15, 0.6, t)),
    metaOp: cl(1.3, 1.7, t),
    date: t > 1.35 ? '12 ago. 2026' : ' ',
    day: t > 1.5 ? 'Qua' : ' ',
    prefix: typed > 0 ? PREFIX.slice(0, Math.min(typed, PREFIX.length)) : ' ',
    num,
    suffix: typed - PREFIX.length - WRONG.length > 0 ? SUFFIX.slice(0, typed - PREFIX.length - WRONG.length) : '',
    line2: (typed - line1.length > 0 ? LINE2.slice(0, typed - line1.length) : '') || ' ',
    code,
    selected,
    editing,
    numAmber: t >= 3.95 && t < 5.35,
    caret: t >= 3.9 && t < 5.3,
    flash: cl(6.05, 6.25, t) * (1 - cl(6.25, 6.85, t)),
    wrapOp: 1 - cl(6.9, 7.45, t),
    fieldPrefix: fieldTyped > 0 ? PREFIX.slice(0, Math.min(fieldTyped, PREFIX.length)) : '',
    fieldSuffix: fieldSuffix > 0 ? FIELD_SUFFIX.slice(0, fieldSuffix) : '',
    placeholder: fieldTyped > 0 ? '' : searching ? 'Localizando' : 'Toque em localizar ou digite o endereço',
    searching,
    tap,
    ringScale: lerp(1.45, 1, ringIn) - tap * 0.26 + ringOut * 0.3,
    ringOp: ringIn * (1 - ringOut),
    rippleScale: 1 + ripple * 1.9,
    rippleOp: ripple > 0 ? (1 - ripple) * 0.8 : 0,
    caption,
  };
}

export function HeroScene() {
  const { t, ref } = useTimeline(DUR, { threshold: 0.12 });
  const v = values(t);

  return (
    <div className="scene" ref={ref}>
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- o site não usa
            o otimizador de imagens: são quatro arquivos estáticos e nenhum
            deles muda de tamanho conforme o dispositivo. */}
        <img src="/obra-490.webp" alt="Fachada de uma obra em andamento, com o número 490 no portão." />
        <div className="scrim" />

        <div className="overlay" style={{ opacity: v.wrapOp }}>
          <div className="stamp-row">
            <p className="stamp-clock" style={{ opacity: v.clockOp }}>
              {v.clock}
            </p>
            <span className="stamp-bar" style={{ transform: `scaleY(${v.bar})` }} />
            <div className="stamp-meta" style={{ opacity: v.metaOp }}>
              <span>{v.date}</span>
              <span>{v.day}</span>
            </div>
          </div>
          <p className="stamp-address">
            {v.prefix}
            <span
              className={v.selected ? 'num selected' : v.numAmber ? 'num amber' : 'num'}
            >
              {v.num}
            </span>
            {v.caret ? <span className="caret" /> : null}
            {v.suffix}
          </p>
          <p className="stamp-address">{v.line2}</p>
          <p className="stamp-code" aria-hidden="true">
            {v.code}
          </p>
        </div>

        <div className="flash" style={{ opacity: v.flash }} />
        <p className="scene-tag">Carimbando em laço</p>
      </div>

      <div className="capture">
        <p className="capture-label">Endereço / local</p>
        <div className={v.editing ? "addr-field editing" : "addr-field"}>
          <p className="field-text">
            {v.placeholder ? (
              <span className={v.searching ? 'placeholder searching' : 'placeholder'}>{v.placeholder}</span>
            ) : (
              <>
                {v.fieldPrefix}
                <span className={v.selected ? 'num selected' : v.numAmber ? 'num amber' : 'num'}>{v.num}</span>
                {v.fieldSuffix}
              </>
            )}
          </p>
          <span className="locate" style={{ background: v.tap > 0 ? 'var(--amber)' : undefined }}>
            <span className="ring" style={{ transform: `scale(${v.ringScale})`, opacity: v.ringOp }} />
            <span className="ripple" style={{ transform: `scale(${v.rippleScale})`, opacity: v.rippleOp }} />
          </span>
        </div>
        <p className="scene-caption">{v.caption}</p>
      </div>
    </div>
  );
}
