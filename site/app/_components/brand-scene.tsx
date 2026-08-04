'use client';

import { cl, eo, lerp, useTimeline } from '../_lib/motion';

/*
 * A mesma foto assinada por duas organizações diferentes, em laço de 8,5 s.
 *
 * A troca no meio do laço é o argumento: o carimbo não carrega a marca do
 * fornecedor de software: carrega a de quem assina o registro — uma
 * construtora numa foto, uma coordenadoria de defesa civil na outra.
 */

const DUR = 8.5;

const BRANDS = [
  { first: 'VIA', second: 'NORTE', sub: 'Engenharia e vistorias — contrato 218', photo: '/via-urbana.webp' },
  { first: 'DEFESA ', second: 'CIVIL', sub: 'Coordenadoria de campo — Setor 4', photo: '/defesa-civil.webp' },
] as const;

const ALT = [
  'Equipe em obra de requalificação viária, com maquinário e calçada em execução.',
  'Equipe de defesa civil em atendimento após deslizamento, com moradores sendo acompanhados.',
] as const;

function values(t: number) {
  const second = t >= 4.85;
  const brand = BRANDS[second ? 1 : 0];
  const full = brand.first + brand.second;

  /* No primeiro trecho o nome é digitado e depois apagado; no segundo, o da
     outra organização é digitado por cima. */
  const typed = second
    ? Math.floor(full.length * cl(4.95, 6.05, t))
    : Math.max(0, Math.floor(full.length * cl(1.35, 2.4, t)) - Math.floor(full.length * cl(4.4, 4.8, t)));

  const logoIn = eo(cl(0.55, 1.15, t));
  const subOp = second ? cl(6.15, 6.6, t) : cl(2.5, 2.95, t) * (1 - cl(4.3, 4.55, t));

  let caption = 'O logotipo entra na imagem, junto do registro.';
  if (t >= 4.4) caption = 'A mesma foto assinada por outra organização — empresa privada ou órgão público.';
  else if (t >= 1.3) caption = 'Nome em duas partes, com cores independentes, e um complemento livre.';

  return {
    index: second ? 1 : 0,
    brand,
    first: brand.first.slice(0, Math.min(typed, brand.first.length)),
    second: typed > brand.first.length ? brand.second.slice(0, typed - brand.first.length) : '',
    sub: brand.sub,
    subOp,
    caret: (t > 1.25 && t < 2.6) || (t > 4.3 && t < 6.25),
    logoScale: lerp(0.35, 1, logoIn),
    logoOp: logoIn,
    /* Quadrado para o órgão público, redondo para a empresa: são duas
       tradições visuais distintas, e a troca deixa isso à mostra. */
    logoRadius: second ? '5px' : '50%',
    wrapOp: 1 - cl(7.95, 8.45, t),
    caption,
  };
}

export function BrandScene() {
  const { t, ref } = useTimeline(DUR, { threshold: 0.2 });
  const v = values(t);

  return (
    <div className="scene" ref={ref}>
      <div className="frame">
        {BRANDS.map((brand, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={brand.photo}
            src={brand.photo}
            alt={ALT[index]}
            style={{ opacity: v.index === index ? 1 : 0 }}
          />
        ))}
        <div className="scrim" />

        <div className="overlay brand" style={{ opacity: v.wrapOp }}>
          <div className="signature">
            <span
              className="logo"
              style={{
                transform: `scale(${v.logoScale})`,
                opacity: v.logoOp,
                borderRadius: v.logoRadius,
              }}
            />
            <div>
              <p className="signature-name">
                {v.first}
                <span className="amber">{v.second}</span>
                {v.caret ? <span className="caret" /> : null}
              </p>
              <p className="signature-sub" style={{ opacity: v.subOp }}>
                {v.sub}
              </p>
            </div>
          </div>

          {/* O bloco de dados é um filho só da sobreposição: com as quatro
              linhas soltas, o `space-between` que separa a assinatura deles
              separaria também uma linha da outra, e a última saía da moldura. */}
          <div className="stamp-block">
            <div className="stamp-row">
              <p className="stamp-clock">07:42</p>
              <span className="stamp-bar" style={{ transform: 'scaleY(1)' }} />
              <div className="stamp-meta">
                <span>12 ago. 2026</span>
                <span>Qua</span>
              </div>
            </div>
            <p className="stamp-address">Av. Puglisi, 490 - Centro,</p>
            <p className="stamp-address">Guarujá - SP, 11410-002</p>
          </div>
          <p className="stamp-code" aria-hidden="true">
            98926A73655DC1
          </p>
        </div>
      </div>

      <p className="scene-caption">{v.caption}</p>
    </div>
  );
}
