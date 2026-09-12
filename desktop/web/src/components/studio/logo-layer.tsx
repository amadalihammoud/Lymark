import { useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import type { FreeLogoPatch, StudioLogo } from "@/store/studio";
import { useStudio } from "@/store/studio";

/** Limites da largura livre, em frações do quadro — os mesmos do aplicativo. */
const WIDTH_MIN = 0.04;
const WIDTH_MAX = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

type Rect = { x: number; y: number; w: number; h: number };

/** O retângulo em px dentro do quadro, traduzido para as frações que o modelo guarda. */
function freeFromRect(rect: Rect, frame: { width: number; height: number }): FreeLogoPatch {
  return {
    at: "free",
    x: clamp((rect.x + rect.w / 2) / frame.width, 0, 1),
    y: clamp((rect.y + rect.h / 2) / frame.height, 0, 1),
    width: clamp(rect.w / frame.width, WIDTH_MIN, WIDTH_MAX),
  };
}

/**
 * Um logotipo sobre a foto, com o mouse (ou o dedo) ligado.
 *
 * Arrastar move; a alça do canto e a roda do mouse redimensionam; clicar
 * seleciona. Mexer num logotipo é soltá-lo: ele vira livre, na fração do
 * quadro onde ficou — a mesma conta que a exportação usa, então o que se vê
 * é o que sai. Serve aos três modos: no bloco e no canto o elemento é posto
 * pelo pai; livre, ele mesmo se posiciona por porcentagem.
 *
 * Um logotipo do bloco ou do canto NÃO vira livre no meio do gesto: virar
 * livre é trocar de pai no DOM, o React remonta o elemento e a captura do
 * ponteiro se perde no primeiro movimento. Durante o gesto o original fica
 * onde está e um fantasma segue o mouse; ao soltar, o modelo muda de uma vez.
 *
 * `layer` é o quadro da foto — é contra ele que as frações são medidas.
 */
export function LogoMark({
  index,
  logo,
  height,
  layer,
  className,
}: {
  index: number;
  logo: StudioLogo;
  /** Altura em px nos modos bloco e canto; ignorada no livre. */
  height: number;
  layer: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const selected = useStudio((s) => s.selectedLogo === index);
  const setSelectedLogo = useStudio((s) => s.setSelectedLogo);
  const updateLogo = useStudio((s) => s.updateLogo);
  const setEditing = useStudio((s) => s.setEditing);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    rect: Rect;
    frame: DOMRect;
  } | null>(null);
  const [ghost, setGhost] = useState<Rect | null>(null);

  const free = logo.at === "free";

  const measure = () => {
    const frame = layer.current?.getBoundingClientRect();
    const own = box.current?.getBoundingClientRect();
    if (!frame || !own || frame.width === 0) return null;
    return {
      frame,
      rect: { x: own.left - frame.left, y: own.top - frame.top, w: own.width, h: own.height },
    };
  };

  /** O retângulo que o gesto produz, a partir do ponto em que o mouse está. */
  const rectAt = (e: { clientX: number; clientY: number }): Rect | null => {
    const d = drag.current;
    if (!d) return null;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const aspect = d.rect.w / Math.max(1, d.rect.h);
    const { width: fw, height: fh } = d.frame;

    if (d.mode === "resize") {
      // O canto superior esquerdo fica; o inferior direito segue o mouse.
      const w = clamp(d.rect.w + dx, WIDTH_MIN * fw, fw);
      return { x: d.rect.x, y: d.rect.y, w, h: w / aspect };
    }
    return {
      x: clamp(d.rect.x + dx, 0, Math.max(0, fw - d.rect.w)),
      y: clamp(d.rect.y + dy, 0, Math.max(0, fh - d.rect.h)),
      w: d.rect.w,
      h: d.rect.h,
    };
  };

  const begin = (e: React.PointerEvent, mode: "move" | "resize") => {
    const measured = measure();
    if (!measured) return;
    e.preventDefault();
    e.stopPropagation();
    setEditing(null);
    setSelectedLogo(index);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, ...measured };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const rect = rectAt(e);
    if (!d || !rect) return;
    if (free) updateLogo(index, freeFromRect(rect, d.frame));
    else setGhost(rect);
  };

  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    const rect = rectAt(e);
    drag.current = null;
    setGhost(null);
    if (!d || !rect) return;
    // Sem movimento não há o que soltar: o clique só seleciona.
    if (e.clientX === d.startX && e.clientY === d.startY) return;
    updateLogo(index, freeFromRect(rect, d.frame));
  };

  const cancel = () => {
    drag.current = null;
    setGhost(null);
  };

  const wheel = (e: React.WheelEvent) => {
    if (!selected) return;
    const measured = measure();
    if (!measured) return;
    e.stopPropagation();
    // Em volta do próprio centro, 5% por dente da roda.
    const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
    const { rect, frame } = measured;
    const w = clamp(rect.w * factor, WIDTH_MIN * frame.width, frame.width);
    const h = w / (rect.w / Math.max(1, rect.h));
    updateLogo(
      index,
      freeFromRect({ x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h }, frame),
    );
  };

  if (!logo.url) return null;

  return (
    <>
      <div
        ref={box}
        data-logo
        className={cn(
          "pointer-events-auto touch-none select-none",
          free ? "absolute -translate-x-1/2 -translate-y-1/2" : "relative inline-block shrink-0",
          ghost ? "opacity-40" : undefined,
          selected && "outline outline-1 outline-dashed outline-amber",
          className,
        )}
        style={
          free
            ? { left: `${logo.x * 100}%`, top: `${logo.y * 100}%`, width: `${logo.width * 100}%` }
            : { height }
        }
        onPointerDown={(e) => begin(e, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onClick={(e) => e.stopPropagation()}
        onWheel={wheel}
      >
        <img
          src={logo.url}
          alt=""
          draggable={false}
          className={cn("block object-contain", drag.current ? "cursor-grabbing" : "cursor-grab")}
          style={
            free
              ? { width: "100%", height: "auto" }
              : { height, width: "auto", maxWidth: height * 2.4 * logo.scale }
          }
        />
        {selected ? (
          <button
            type="button"
            aria-label="resize"
            className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-amber"
            onPointerDown={(e) => begin(e, "resize")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
          />
        ) : null}
      </div>
      {ghost && layer.current
        ? createPortal(
            <img
              src={logo.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute outline outline-1 outline-dashed outline-amber"
              style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h }}
            />,
            layer.current,
          )
        : null}
    </>
  );
}
