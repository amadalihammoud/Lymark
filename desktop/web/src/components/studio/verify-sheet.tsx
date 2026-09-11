import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

import { clockFromDate } from "@/lib/datetime";
import { getAttestPublicKey } from "@/lib/lymark/api";
import { asArrayBuffer } from "@/lib/lymark/hash";
import { verifyJpeg, type VerifyVerdict } from "@/lib/lymark/verify-client";
import {
  extractCodeFromName,
  readStampCodeFromBlob,
  type StampCodeHit,
} from "@/lib/read-stamp-code";
import { useStudio } from "@/store/studio";

export function VerifySheet() {
  const t = useTranslations("app.web");
  const tv = useTranslations("site.verify");
  const open = useStudio((s) => s.verifyOpen);
  const setVerifyOpen = useStudio((s) => s.setVerifyOpen);
  const [verdict, setVerdict] = useState<VerifyVerdict | null>(null);
  const [ocr, setOcr] = useState<StampCodeHit | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void getAttestPublicKey()
      .then((r) => setPublicKey(r.publicKey))
      .catch(() => setPublicKey(null));
  }, [open]);

  if (!open) return null;

  async function onFile(file: File) {
    setBusy(true);
    setOcr(null);
    setName(file.name);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const key =
        publicKey ?? (await getAttestPublicKey().then((r) => r.publicKey).catch(() => null));
      const next = await verifyJpeg(bytes, key);
      setVerdict(next);
      if (next.kind === "missing") {
        const fromName = extractCodeFromName(file.name);
        if (fromName) {
          setOcr({ code: fromName, confidence: 1, where: "name" });
        } else {
          setOcrBusy(true);
          try {
            const blob = new Blob([asArrayBuffer(bytes)], { type: file.type || "image/jpeg" });
            setOcr(await readStampCodeFromBlob(blob));
          } catch {
            setOcr(null);
          } finally {
            setOcrBusy(false);
          }
        }
      }
    } catch {
      setVerdict({ kind: "unconfigured" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy-950/70 p-6">
      <div className="w-full max-w-lg rounded-md border border-hairline bg-navy-800 shadow-[var(--shadow-panel)]">
        <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <div>
            <p className="text-title font-medium text-ink">{tv("title")}</p>
            <p className="text-caption text-slate">{t("fileStays")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setVerifyOpen(false);
              setVerdict(null);
              setOcr(null);
              setName(null);
            }}
            className="h-8 rounded-sm border border-hairline px-3 text-caption text-mist hover:bg-lift"
          >
            {t("close")}
          </button>
        </header>
        <div className="space-y-4 p-5">
          <label
            className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-hairline text-center text-ui text-mist hover:border-mist"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void onFile(file);
            }}
          >
            <span>{busy ? t("reading") : t("dropJpeg")}</span>
            <input
              type="file"
              accept="image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {name ? <p className="font-mono text-micro text-slate">{name}</p> : null}
          {verdict?.kind === "intact" ? (
            <div className="space-y-1 text-ui">
              <p className="font-medium text-ok">{tv("sealedTitle")}</p>
              <p className="text-mist">
                {tv("sealedBody", {
                  account: verdict.sub,
                  date: `${clockFromDate(new Date(verdict.issuedAt)).date} ${clockFromDate(new Date(verdict.issuedAt)).time}`,
                })}
              </p>
              <p className="text-caption text-slate">{tv("declarationNote")}</p>
            </div>
          ) : null}
          {verdict?.kind === "missing" ? (
            <div className="space-y-2 text-ui">
              <p className="font-medium text-mist">{tv("noSealTitle")}</p>
              {ocrBusy ? (
                <p className="text-caption text-slate">{t("lookingCode")}</p>
              ) : ocr ? (
                <>
                  <p className="font-mono text-body tracking-wider text-amber">
                    {ocr.code}
                  </p>
                  <p className="text-mist">
                    {ocr.where === "name" ? t("codeInName") : t("codeOnStamp")}
                  </p>
                </>
              ) : (
                <p className="text-mist">{t("noCodeFound")}</p>
              )}
            </div>
          ) : null}
          {verdict?.kind === "tampered" ? (
            <p className="text-ui text-danger">{tv("tamperedBody")}</p>
          ) : null}
          {verdict?.kind === "unconfigured" ? (
            <p className="text-ui text-slate">{tv("notConfigured")}</p>
          ) : null}
          {verdict?.kind === "unsupported" ? (
            <p className="text-ui text-slate">{tv("unsupported")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
