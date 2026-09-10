import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { StampOverlay } from "@/components/studio/stamp-overlay";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

function useFittedBox(nw: number, nh: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || nw <= 0 || nh <= 0) return;
    const fit = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const scale = Math.min(cw / nw, ch / nh);
      setBox({
        w: Math.max(1, Math.round(nw * scale)),
        h: Math.max(1, Math.round(nh * scale)),
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nw, nh]);

  return { ref, box };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function CanvasStage({
  onOpenFiles,
}: {
  onOpenFiles: (files: FileList | File[]) => void;
}) {
  const t = useTranslations("app.mesa");
  const media = useStudio((s) => s.media);
  const mode = useStudio((s) => s.mode);
  const setEditing = useStudio((s) => s.setEditing);
  const setCanvasZoom = useStudio((s) => s.setCanvasZoom);
  const canvasZoom = useStudio((s) => s.canvasZoom);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { ref, box } = useFittedBox(media?.width ?? 0, media?.height ?? 0);
  const view = useRef({ z: 1, x: 0, y: 0 });
  const space = useRef(false);
  const panning = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [hand, setHand] = useState(false);
  const [grabbing, setGrabbing] = useState(false);

  const applyView = (z: number, x: number, y: number) => {
    const nz = z <= 1.02 ? 1 : clamp(z, 1, 8);
    const nx = nz === 1 ? 0 : x;
    const ny = nz === 1 ? 0 : y;
    view.current = { z: nz, x: nx, y: ny };
    setCanvasZoom(nz);
    const photo = ref.current?.querySelector("[data-photo]") as HTMLElement | null;
    if (photo) {
      photo.style.transform = `translate(-50%, -50%) translate(${nx}px, ${ny}px) scale(${nz})`;
    }
  };

  useEffect(() => {
    applyView(1, 0, 0);
  }, [media?.id]);

  useEffect(() => {
    if (canvasZoom === 1 && view.current.z !== 1) applyView(1, 0, 0);
  }, [canvasZoom]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (e: WheelEvent) => {
      if (!media) return;
      e.preventDefault();
      const photo = ref.current?.querySelector("[data-photo]") as HTMLElement | null;
      if (!photo) return;
      const rect = photo.getBoundingClientRect();
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      const { z, x, y } = view.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nz = clamp(z * factor, 1, 8);
      const worldX = (mx - x) / z;
      const worldY = (my - y) / z;
      applyView(nz, mx - worldX * nz, my - worldY * nz);
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [media]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        space.current = e.type === "keydown";
        setHand(space.current);
        if (e.type === "keyup") {
          panning.current = false;
          setGrabbing(false);
        }
      }
      if (e.key === "0" && !e.metaKey && !e.ctrlKey) {
        applyView(1, 0, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-navy-900",
        grabbing ? "cursor-grabbing" : hand ? "cursor-grab" : undefined,
      )}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) onOpenFiles(e.dataTransfer.files);
      }}
      onClick={() => setEditing(null)}
      onDoubleClick={() => applyView(1, 0, 0)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (!space.current && view.current.z <= 1) return;
        if ((e.target as HTMLElement).closest("[data-stamp]")) return;
        panning.current = true;
        setGrabbing(true);
        last.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!panning.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        const { z, x, y } = view.current;
        applyView(z, x + dx, y + dy);
      }}
      onPointerUp={() => {
        panning.current = false;
        setGrabbing(false);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={mode === "video" ? "video/*" : "image/*"}
        multiple={mode === "batch"}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onOpenFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {media ? (
        <div ref={ref} className="absolute inset-6 sm:inset-8">
          <div
            data-photo
            className="absolute left-1/2 top-1/2 overflow-hidden shadow-[var(--shadow-photo)]"
            style={{
              width: box.w,
              height: box.h,
              transform: "translate(-50%, -50%)",
            }}
          >
            {media.kind === "video" ? (
              <video
                src={media.url}
                className="h-full w-full object-cover"
                controls={false}
                muted
                playsInline
                autoPlay
                loop
              />
            ) : (
              <img
                src={media.url}
                alt=""
                crossOrigin="anonymous"
                className="h-full w-full select-none object-cover"
                draggable={false}
              />
            )}
            <StampOverlay />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-3 text-center"
        >
          <span className="text-title font-medium text-ink">
            {mode === "video"
              ? t("dropVideo")
              : mode === "batch"
                ? t("dropBatch")
                : t("dropPhoto")}
          </span>
          <span className="text-ui text-slate">
            <kbd>Ctrl</kbd>
            <span className="mx-1 text-steel">+</span>
            <kbd>O</kbd>
            <span className="ms-2">{t("toOpen")}</span>
          </span>
        </button>
      )}
    </div>
  );
}
