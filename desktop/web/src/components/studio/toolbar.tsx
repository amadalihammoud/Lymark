import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  onAccount,
  canReport,
}: {
  onVerify: () => void;
  onReport: () => void;
  onAccount: () => void;
  canReport: boolean;
}) {
  const t = useTranslations("app.web");
  const tAccount = useTranslations("app.account");
  const tLang = useTranslations("app.language");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; end: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (root.current?.contains(target) || menu.current?.contains(target)) return;
      setOpen(false);
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

  useEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const place = () => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      setBox({
        top: r.bottom + 4,
        end: rtl ? r.left : window.innerWidth - r.right,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const itemClass =
    "flex h-9 w-full items-center px-3 text-start text-body text-mist hover:bg-lift hover:text-ink";

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
      {open && box
        ? createPortal(
            <div
              ref={menu}
              role="menu"
              style={{ top: box.top, insetInlineEnd: box.end }}
              className="fixed z-50 min-w-40 border border-hairline bg-navy-800 py-1 shadow-[var(--shadow-panel)]"
            >
              <button
                type="button"
                role="menuitem"
                className={itemClass}
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
                className={cn(itemClass, "disabled:opacity-40")}
                onClick={() => {
                  setOpen(false);
                  onReport();
                }}
              >
                {t("reportMenu")}
              </button>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  onAccount();
                }}
              >
                {tAccount("title")}
                <span className="ms-auto ps-3 text-caption text-slate">{tLang("label")}</span>
              </button>
            </div>,
            document.body,
          )
        : null}
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
  const t = useTranslations("app.web");
  const tCommon = useTranslations("app.common");
  const tAccount = useTranslations("app.account");
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const inspectorOpen = useStudio((s) => s.inspectorOpen);
  const toggleInspector = useStudio((s) => s.toggleInspector);
  const media = useStudio((s) => s.media);
  const entitlement = useStudio((s) => s.entitlement);
  const billedIds = useStudio((s) => s.billedIds);
  const setReportOpen = useStudio((s) => s.setReportOpen);
  const setVerifyOpen = useStudio((s) => s.setVerifyOpen);
  const setAccountOpen = useStudio((s) => s.setAccountOpen);
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
    <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-hairline bg-navy-900 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
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
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <MoreMenu
          onVerify={() => setVerifyOpen(true)}
          onReport={() => setReportOpen(true)}
          onAccount={() => setAccountOpen(true)}
          canReport={Boolean(media)}
        />
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="hidden h-10 items-center px-3 text-body font-medium text-mist hover:text-ink sm:inline-flex"
        >
          {tAccount("title")}
        </button>
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
