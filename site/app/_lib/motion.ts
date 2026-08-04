'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * A base das três cenas animadas da página inicial.
 *
 * As curvas e a forma de contar o tempo vieram do desenho original, e foram
 * mantidas como estavam: o que dá a cada cena o seu ritmo são os instantes
 * exatos em que cada coisa acontece — o endereço termina de ser digitado em
 * 3,05 s, o número fica selecionado de 3,45 a 3,95 —, e reescrever as curvas
 * mudaria todos eles de uma vez.
 */

/** Fração de 0 a 1 do quanto `x` avançou entre `a` e `b`. */
export const cl = (a: number, b: number, x: number) =>
  Math.max(0, Math.min(1, (x - a) / (b - a)));

/** Desaceleração cúbica: rápido no começo, assenta no fim. */
export const eo = (x: number) => 1 - Math.pow(1 - x, 3);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Options = {
  /** Segundos de pausa entre um laço e o próximo. */
  pause?: number;
  /** Fração da altura visível a partir da qual a cena começa a rodar. */
  threshold?: number;
};

/**
 * Devolve o tempo corrente de uma linha do tempo em laço, em segundos.
 *
 * A cena só anda enquanto está na tela: fora dela o `requestAnimationFrame` é
 * cancelado, porque uma animação que ninguém vê é bateria gasta à toa — e num
 * aplicativo de campo isso não é detalhe.
 *
 * Quem prefere menos movimento não recebe movimento nenhum: a linha do tempo
 * fica parada no último quadro, que é o estado de repouso de todas as três.
 */
export function useTimeline(duration: number, options: Options = {}) {
  const { pause = 2, threshold = 0.2 } = options;
  const [t, setT] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setT(duration);
      return;
    }

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const play = () => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = Math.min(duration, (now - start) / 1000);
        setT(elapsed);
        if (elapsed < duration) {
          raf = requestAnimationFrame(step);
        } else {
          timer = setTimeout(play, Math.max(0, pause) * 1000);
        }
      };
      raf = requestAnimationFrame(step);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !running) {
          running = true;
          play();
        } else if (!visible && running) {
          running = false;
          stop();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [duration, pause, threshold]);

  return { t, ref };
}
