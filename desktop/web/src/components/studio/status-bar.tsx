import { useTranslations } from "use-intl";

import { remainingPhotos } from "@/lib/lymark/types";
import { useStudio } from "@/store/studio";

export function StatusBar() {
  const t = useTranslations("app.web");
  const tCommon = useTranslations("app.common");
  const tPlan = useTranslations("app.plan");
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

  const modeLabel =
    mode === "video" ? t("video") : mode === "batch" ? t("batch") : t("photo");

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
            <span className="text-amber">{t("alreadyStamped")}</span>
          ) : null}
          {media.gps ? <span>{t("photoGps")}</span> : null}
        </>
      ) : (
        <span>{t("emptyDesk")}</span>
      )}
      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        className="tabular-nums hover:text-mist"
      >
        {remaining === null ? tPlan("pro") : t("leftCount", { count: remaining })}
      </button>
      {canvasZoom > 1 ? (
        <button
          type="button"
          onClick={() => setCanvasZoom(1)}
          className="tabular-nums hover:text-mist"
          title={t("fitHint")}
        >
          {Math.round(canvasZoom * 100)}%
        </button>
      ) : null}
      <span className="ms-auto hidden items-center gap-2 sm:flex">
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
          <span className="font-sans tracking-normal">{t("stamp")}</span>
        </span>
      </span>
      {batchBusy ? (
        <span className="tabular-nums text-amber">
          {batchDone}/{batch.length}
        </span>
      ) : lastSaved ? (
        <span className={lastSeal === "on" ? "text-ok" : "text-slate"}>
          {lastSeal === "on"
            ? t("lastSeal")
            : lastSeal === "off"
              ? t("lastSealOff")
              : tCommon("save")}
        </span>
      ) : null}
    </footer>
  );
}
