import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AccountPanel } from "@/components/studio/account-panel";
import { BatchRail } from "@/components/studio/batch-rail";
import { CanvasStage } from "@/components/studio/canvas-stage";
import { Inspector } from "@/components/studio/inspector";
import { ReportSheet } from "@/components/studio/report-sheet";
import { StatusBar } from "@/components/studio/status-bar";
import { Chrome } from "@/components/studio/toolbar";
import { VerifySheet } from "@/components/studio/verify-sheet";
import {
  downloadBlob,
  exportStampedJpeg,
  exportVideoFrame,
  shareBlob,
} from "@/lib/export-stamp";
import { enrichMediaList } from "@/lib/ingest-photo";
import { fileToMedia } from "@/lib/load-media";
import { getEntitlements, syncEntitlements } from "@/lib/lymark/api";
import { asArrayBuffer, blobToBytes } from "@/lib/lymark/hash";
import { sealExportedPhoto } from "@/lib/lymark/seal-export";
import { canExportNow } from "@/lib/lymark/types";
import { lookFrom } from "@/lib/stamp-look";
import { useStudio } from "@/store/studio";

function currentLook() {
  const s = useStudio.getState();
  return lookFrom(s);
}

export function DesktopShell() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const media = useStudio((s) => s.media);
  const mode = useStudio((s) => s.mode);
  const setMedia = useStudio((s) => s.setMedia);
  const addBatch = useStudio((s) => s.addBatch);
  const batch = useStudio((s) => s.batch);
  const setBatchProgress = useStudio((s) => s.setBatchProgress);
  const selectBatch = useStudio((s) => s.selectBatch);
  const regenCode = useStudio((s) => s.regenCode);
  const markBilled = useStudio((s) => s.markBilled);
  const setEntitlement = useStudio((s) => s.setEntitlement);
  const setLastSeal = useStudio((s) => s.setLastSeal);
  const markSaved = useStudio((s) => s.markSaved);
  const toggleInspector = useStudio((s) => s.toggleInspector);
  const patchMedia = useStudio((s) => s.patchMedia);
  const setInspector = useStudio((s) => s.setInspector);
  const hydrateKit = useStudio((s) => s.hydrateKit);

  useEffect(() => {
    hydrateKit();
  }, [hydrateKit]);

  useEffect(() => {
    void getEntitlements()
      .then(setEntitlement)
      .catch(() => undefined);
  }, [setEntitlement]);

  const onOpenFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      try {
        const items = await Promise.all(list.map(fileToMedia));
        for (const item of items) {
          if (item.existingCode) {
            toast.message("Esta foto já tem carimbo", {
              description: item.existingCode,
            });
          }
        }
        if (mode === "batch" || items.length > 1) addBatch(items);
        else if (items[0]) setMedia(items[0]);
        void enrichMediaList(items, (next) => {
          patchMedia(next.id, {
            place: next.place,
            existingCode: next.existingCode,
            gps: next.gps,
            capturedAt: next.capturedAt,
          });
        });
      } catch {
        toast.error("Não foi possível abrir o arquivo.");
      }
    },
    [addBatch, mode, patchMedia, setMedia],
  );

  const exportOne = useCallback(
    async (item: { id: string; kind: "image" | "video"; url: string }, share = false) => {
      const look = currentLook();
      const stamped =
        item.kind === "video"
          ? await exportVideoFrame(item.url, look)
          : await exportStampedJpeg(item.url, look);
      let blob = stamped.blob;
      let filename = stamped.filename;
      if (item.kind === "image") {
        const sealed = await sealExportedPhoto(await blobToBytes(blob));
        blob = new Blob([asArrayBuffer(sealed.bytes)], { type: "image/jpeg" });
        setLastSeal(sealed.sealed ? "on" : "off");
      } else {
        setLastSeal(null);
      }
      if (share) await shareBlob(blob, filename);
      else downloadBlob(blob, filename);
      markBilled(item.id);
      markSaved(filename);
      regenCode();
      try {
        const next = await syncEntitlements({ data: { spent: 1 } });
        setEntitlement(next);
      } catch {
        /* offline */
      }
    },
    [markBilled, markSaved, regenCode, setEntitlement, setLastSeal],
  );

  const onSave = useCallback(async () => {
    const state = useStudio.getState();
    const current = state.media;
    if (!current) return;
    const billed = state.billedIds.includes(current.id);
    if (!canExportNow(state.entitlement, billed)) {
      toast.error("Cota esgotada.");
      return;
    }
    setSaving(true);
    try {
      if (state.mode === "batch" && state.batch.length) {
        setBatchProgress(0, true);
        for (let i = 0; i < state.batch.length; i += 1) {
          const item = state.batch[i];
          if (!item) continue;
          selectBatch(i);
          await exportOne(item);
          setBatchProgress(i + 1, true);
        }
        setBatchProgress(state.batch.length, false);
      } else {
        await exportOne(current);
      }
    } catch {
      toast.error("Falha ao exportar.");
      setBatchProgress(0, false);
    } finally {
      setSaving(false);
    }
  }, [exportOne, selectBatch, setBatchProgress]);

  const onShare = useCallback(async () => {
    if (!media) return;
    setSaving(true);
    try {
      await exportOne(media, true);
    } catch {
      toast.error("Não foi possível compartilhar.");
    } finally {
      setSaving(false);
    }
  }, [exportOne, media]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSave();
      }
      if (meta && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileRef.current?.click();
      }
      if (!meta && e.key.toLowerCase() === "i" && e.target === document.body) {
        toggleInspector();
      }
      if (e.key === "Escape") {
        if (document.querySelector('[role="dialog"], [role="menu"]')) return;
        setInspector(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave, setInspector, toggleInspector]);

  return (
    <div className="flex h-dvh flex-col bg-navy-900 text-ink">
      <Chrome
        onOpen={() => fileRef.current?.click()}
        onSave={() => void onSave()}
        onShare={() => void onShare()}
        saving={saving}
      />
      <div className="relative flex min-h-0 flex-1">
        <BatchRail />
        <CanvasStage onOpenFiles={(files) => void onOpenFiles(files)} />
        <Inspector />
      </div>
      <StatusBar />
      <input
        ref={fileRef}
        type="file"
        accept={mode === "video" ? "video/*" : "image/*"}
        multiple={mode === "batch"}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void onOpenFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <ReportSheet />
      <VerifySheet />
      <AccountPanel />
    </div>
  );
}
