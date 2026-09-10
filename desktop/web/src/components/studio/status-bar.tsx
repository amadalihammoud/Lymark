import { remainingPhotos } from "@/lib/lymark/types";
import { useStudio } from "@/store/studio";

export function StatusBar() {
  const media = useStudio((s) => s.media);
  const lastSaved = useStudio((s) => s.lastSaved);
  const lastSeal = useStudio((s) => s.lastSeal);
  const mode = useStudio((s) => s.mode);
  const batchBusy = useStudio((s) => s.batchBusy);
  const batchDone = useStudio((s) => s.batchDone);
  const batch = useStudio((s) => s.batch);
  const entitlement = useStudio((s) => s.entitlement);
  const setAccountOpen = useStudio((s) => s.setAccountOpen);
  const remaining = remainingPhotos(entitlement);
  const canvasZoom = useStudio((s) => s.canvasZoom);
  const setCanvasZoom = useStudio((s) => s.setCanvasZoom);

  const modeLabel = mode === "video" ? "Vídeo" : mode === "batch" ? "Lote" : "Foto";

  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-hairline bg-navy-900 px-4 font-mono text-micro text-slate">
      <span className="uppercase tracking-wider">{modeLabel}</span>
      {media ? (
        <>
          <span className="min-w-0 truncate">{media.name}</span>
          <span className="tabular-nums">
            {media.width}×{media.height}
          </span>
          {media.existingCode ? (
            <span className="text-amber">já carimbada</span>
          ) : null}
          {media.gps ? <span>GPS da foto</span> : null}
        </>
      ) : (
        <span>Mesa vazia</span>
      )}
      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        className="hidden tabular-nums hover:text-mist md:inline"
      >
        {remaining === null ? "Pro" : `${remaining} restantes`}
      </button>
      {canvasZoom > 1 ? (
        <button
          type="button"
          onClick={() => setCanvasZoom(1)}
          className="tabular-nums hover:text-mist"
          title="0 para caber"
        >
          {Math.round(canvasZoom * 100)}%
        </button>
      ) : null}
      <span className="ml-auto hidden items-center gap-2 sm:flex">
        <span className="inline-flex items-center gap-1">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>S</kbd>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>O</kbd>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd>I</kbd>
          <span className="font-sans tracking-normal">carimbo</span>
        </span>
      </span>
      {batchBusy ? (
        <span className="tabular-nums text-amber">
          {batchDone}/{batch.length}
        </span>
      ) : lastSaved ? (
        <span className={lastSeal === "on" ? "text-ok" : "text-slate"}>
          {lastSeal === "on" ? "Selo" : lastSeal === "off" ? "Sem selo" : "Salvo"}
        </span>
      ) : null}
    </footer>
  );
}
