import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { AccountPanel } from "@/components/studio/account-panel";
import { BatchRail } from "@/components/studio/batch-rail";
import { CanvasStage } from "@/components/studio/canvas-stage";
import { Inspector } from "@/components/studio/inspector";
import { ReportSheet } from "@/components/studio/report-sheet";
import { StatusBar } from "@/components/studio/status-bar";
import { Chrome } from "@/components/studio/toolbar";
import { VerifySheet } from "@/components/studio/verify-sheet";
import { useLocalePreference } from "@/i18n/locale-provider";
import { clockFromDate } from "@/lib/datetime";
import { desktop } from "@/lib/desktop";
import { sealVideoOnDesktop, stampVideoOnDesktop } from "@/lib/desktop-video";
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
import { useStudio, type MediaItem } from "@/store/studio";

function currentLook() {
  const s = useStudio.getState();
  return lookFrom(s);
}

export function DesktopShell() {
  const t = useTranslations("app.web");
  // "Processando… {percent}%" e "Salvo em {path}" já existem para o vídeo do
  // aplicativo; no desktop servem aos dois, foto e vídeo.
  const tVideo = useTranslations("app.video");
  const { locale } = useLocalePreference();
  const fileRef = useRef<HTMLInputElement>(null);
  const localeReady = useRef(false);
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
  const setMode = useStudio((s) => s.setMode);
  const setReportOpen = useStudio((s) => s.setReportOpen);
  const setAccountOpen = useStudio((s) => s.setAccountOpen);

  useEffect(() => {
    hydrateKit();
  }, [hydrateKit]);

  /**
   * Dentro do desktop: o menu do sistema pede telas por rota (o contrato
   * herdado do aplicativo), e o idioma escolhido aqui traduz esse menu e os
   * diálogos de arquivo. Fora do desktop os dois efeitos não fazem nada.
   */
  useEffect(() => {
    void desktop?.setLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!desktop) return;
    desktop.onNavigate((route) => {
      // Idioma e "sobre" moram no painel da conta.
      if (route.startsWith("/settings")) setAccountOpen(true);
      else if (route === "/batch") setMode("batch");
      else if (route === "/video") setMode("video");
      else if (route === "/report") setReportOpen(true);
      else setMode("photo");
    });
  }, [setAccountOpen, setMode, setReportOpen]);

  useEffect(() => {
    void getEntitlements()
      .then(setEntitlement)
      .catch(() => undefined);
  }, [setEntitlement]);

  useEffect(() => {
    if (!localeReady.current) {
      localeReady.current = true;
      return;
    }
    const state = useStudio.getState();
    const captured = state.media?.capturedAt
      ? new Date(state.media.capturedAt)
      : null;
    const clock =
      captured && !Number.isNaN(captured.getTime())
        ? clockFromDate(captured, locale)
        : null;
    if (clock) {
      useStudio.setState({ fields: { ...state.fields, ...clock } });
    } else {
      state.syncClock();
    }
  }, [locale]);

  const onOpenFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      try {
        const items = await Promise.all(list.map(fileToMedia));
        for (const item of items) {
          if (item.existingCode) {
            toast.message(t("alreadyStampedToast"), {
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
        toast.error(t("openFailed"));
      }
    },
    [addBatch, mode, patchMedia, setMedia, t],
  );

  /**
   * No desktop, abrir vídeo é o diálogo do sistema: o ffmpeg precisa do
   * caminho real, que um `<input type="file">` não entrega. A prévia carrega
   * pela URL `media://` que o processo principal cunhou para esse arquivo.
   */
  const openDesktopVideo = useCallback(async () => {
    if (!desktop) return;
    const picked = await desktop.pickVideo();
    if (picked.status === "cancelled") return;
    if (
      picked.status !== "selected" ||
      !picked.url ||
      !picked.path ||
      !picked.width ||
      !picked.height
    ) {
      toast.error(t("openFailed"));
      return;
    }
    setMedia({
      id: `desktop-${Date.now().toString(36)}`,
      kind: "video",
      url: picked.url,
      path: picked.path,
      durationMs: picked.durationMs,
      name: picked.name ?? "video",
      width: picked.width,
      height: picked.height,
      gps: null,
      // A data do arquivo é o análogo do EXIF: preenche o relógio, editável.
      capturedAt: picked.modifiedMs ? new Date(picked.modifiedMs).toISOString() : null,
      existingCode: null,
      place: null,
    });
  }, [setMedia, t]);

  const openFiles = useCallback(() => {
    if (desktop && mode === "video") void openDesktopVideo();
    else fileRef.current?.click();
  }, [mode, openDesktopVideo]);

  const chargeQuota = useCallback(async () => {
    try {
      const next = await syncEntitlements({ data: { spent: 1 } });
      setEntitlement(next);
    } catch {
      /* offline */
    }
  }, [setEntitlement]);

  const exportOne = useCallback(
    async (item: MediaItem, share = false) => {
      const look = currentLook();

      // O vídeo inteiro, pelo ffmpeg do desktop. No navegador o que sai é um
      // quadro carimbado (abaixo) — é o que ele alcança sem reencodar.
      if (item.kind === "video" && desktop && item.path && !share) {
        const progress = toast.loading(tVideo("processing", { percent: 0 }));
        let result: Awaited<ReturnType<typeof stampVideoOnDesktop>>;
        try {
          result = await stampVideoOnDesktop({
            path: item.path,
            width: item.width,
            height: item.height,
            durationMs: item.durationMs ?? 0,
            look,
            onProgress: (percent) =>
              toast.loading(tVideo("processing", { percent }), { id: progress }),
          });
        } finally {
          toast.dismiss(progress);
        }
        if (result.status === "cancelled") return;
        if (result.status !== "saved" || !result.path) {
          throw new Error(result.error ?? "ffmpeg");
        }
        setLastSeal((await sealVideoOnDesktop(result.path)) ? "on" : "off");
        markBilled(item.id);
        markSaved(result.path.split(/[\\/]/).pop() ?? result.path);
        regenCode();
        toast.success(tVideo("saved", { path: result.path }));
        await chargeQuota();
        return;
      }

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
      if (share) {
        await shareBlob(blob, filename);
      } else if (desktop) {
        // Direto na pasta de saída, sem diálogo — é o que faz o lote render
        // no desktop: uma foto atrás da outra, sem uma janela por foto.
        const saved = await desktop.saveFileToOutput(await blobToBytes(blob), filename, blob.type);
        if (saved.status !== "saved") throw new Error(saved.error ?? "save");
        toast.success(tVideo("saved", { path: saved.path ?? filename }));
      } else {
        downloadBlob(blob, filename);
      }
      markBilled(item.id);
      markSaved(filename);
      regenCode();
      await chargeQuota();
    },
    [chargeQuota, markBilled, markSaved, regenCode, setLastSeal, tVideo],
  );

  const onSave = useCallback(async () => {
    const state = useStudio.getState();
    const current = state.media;
    if (!current) return;
    const billed = state.billedIds.includes(current.id);
    if (!canExportNow(state.entitlement, billed)) {
      toast.error(t("quotaExhausted"));
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
      toast.error(t("exportFailed"));
      setBatchProgress(0, false);
    } finally {
      setSaving(false);
    }
  }, [exportOne, selectBatch, setBatchProgress, t]);

  const onShare = useCallback(async () => {
    if (!media) return;
    setSaving(true);
    try {
      await exportOne(media, true);
    } catch {
      toast.error(t("shareFailed"));
    } finally {
      setSaving(false);
    }
  }, [exportOne, media, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSave();
      }
      if (meta && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFiles();
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
  }, [onSave, openFiles, setInspector, toggleInspector]);

  return (
    <div className="flex h-dvh flex-col bg-navy-900 text-ink">
      <Chrome
        onOpen={openFiles}
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
