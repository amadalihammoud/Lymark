import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { Segmented } from "@/components/studio/segmented";
import { Wordmark } from "@/components/wordmark";
import { canExportNow } from "@/lib/lymark/types";
import { cn } from "@/lib/utils";
import type { StudioMode } from "@/store/studio";
import { useStudio } from "@/store/studio";

function Sep() {
  return <span className="mx-1 hidden h-5 w-px bg-hairline sm:block" aria-hidden />;
}

function MoreMenu({
  onVerify,
  onReport,
  canReport,
}: {
  onVerify: () => void;
  onReport: () => void;
  canReport: boolean;
}) {
  const t = useTranslations("app.mesa");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("more")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center text-mist hover:text-ink",
          open && "text-ink",
        )}
      >
        <span className="font-medium tracking-widest">···</span>
        {open ? <span className="absolute inset-x-2 bottom-1.5 h-px bg-amber" /> : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-20 mt-1 min-w-40 border border-hairline bg-navy-800 py-1 shadow-[var(--shadow-panel)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-start text-body text-mist hover:bg-lift hover:text-ink"
            onClick={() => {
              setOpen(false);
              onVerify();
            }}
          >
            {t("verifyMenu")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canReport}
            className="flex h-9 w-full items-center px-3 text-start text-body text-mist hover:bg-lift hover:text-ink disabled:opacity-40"
            onClick={() => {
              setOpen(false);
              onReport();
            }}
          >
            {t("reportMenu")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Chrome({
  onOpen,
  onSave,
  onShare,
  saving,
}: {
  onOpen: () => void;
  onSave: () => void;
  onShare: () => void;
  saving: boolean;
}) {
  const t = useTranslations("app.mesa");
  const tCommon = useTranslations("app.common");
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const inspectorOpen = useStudio((s) => s.inspectorOpen);
  const toggleInspector = useStudio((s) => s.toggleInspector);
  const media = useStudio((s) => s.media);
  const entitlement = useStudio((s) => s.entitlement);
  const billedIds = useStudio((s) => s.billedIds);
  const setReportOpen = useStudio((s) => s.setReportOpen);
  const setVerifyOpen = useStudio((s) => s.setVerifyOpen);
  const batch = useStudio((s) => s.batch);
  const batchBusy = useStudio((s) => s.batchBusy);
  const billed = media ? billedIds.includes(media.id) : false;
  const allowed = canExportNow(entitlement, billed);
  const openLabel =
    mode === "video" ? t("openVideo") : mode === "batch" ? t("openBatch") : t("openPhoto");
  const saveLabel =
    mode === "batch"
      ? batchBusy
        ? t("stamping")
        : batch.length
          ? t("saveBatchCount", { count: batch.length })
          : t("saveBatch")
      : mode === "video"
        ? saving
          ? t("saving")
          : t("saveFrame")
        : saving
          ? t("saving")
          : tCommon("save");

  const modes: { id: StudioMode; label: string }[] = [
    { id: "photo", label: t("photo") },
    { id: "video", label: t("video") },
    { id: "batch", label: t("batch") },
  ];

  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 overflow-x-auto border-b border-hairline bg-navy-900 px-3 sm:px-4">
      <Wordmark compact />

      <Segmented variant="pill" value={mode} onChange={setMode} options={modes} />

      <button
        type="button"
        onClick={onOpen}
        title="Ctrl+O"
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-sm border border-hairline px-4 py-1 text-center text-body font-semibold leading-tight text-mist hover:bg-lift hover:text-ink"
      >
        <span className="max-w-[7.5rem] text-balance">{openLabel}</span>
      </button>

      <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <MoreMenu
          onVerify={() => setVerifyOpen(true)}
          onReport={() => setReportOpen(true)}
          canReport={Boolean(media)}
        />
        <button
          type="button"
          onClick={onShare}
          disabled={!media || saving}
          className="hidden h-10 items-center px-3 text-body font-medium text-mist hover:text-ink disabled:opacity-40 sm:inline-flex"
        >
          {tCommon("share")}
        </button>
        <Sep />
        <button
          type="button"
          onClick={toggleInspector}
          title="I"
          className={cn(
            "relative min-h-10 px-3 py-1 text-center text-body font-medium leading-tight",
            inspectorOpen ? "text-ink" : "text-mist hover:text-ink",
          )}
        >
          <span className="max-w-[6.5rem] text-balance">{t("stamp")}</span>
          {inspectorOpen ? (
            <span className="absolute inset-x-3 bottom-1.5 h-px bg-amber" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!media || saving || !allowed || batchBusy}
          title="Ctrl+S"
          className="inline-flex min-h-10 shrink-0 items-center rounded-sm bg-amber px-5 py-1 text-center text-body font-semibold leading-tight text-on-amber hover:bg-amber-dark disabled:opacity-40"
        >
          <span className="max-w-[8rem] text-balance">{saveLabel}</span>
        </button>
      </div>
    </header>
  );
}
