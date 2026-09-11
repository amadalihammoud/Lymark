import { useTranslations } from "use-intl";

import { useStudio } from "@/store/studio";

export function ReportSheet() {
  const t = useTranslations("app.web");
  const tw = useTranslations("app.watermark");
  const open = useStudio((s) => s.reportOpen);
  const setReportOpen = useStudio((s) => s.setReportOpen);
  const media = useStudio((s) => s.media);
  const fields = useStudio((s) => s.fields);
  const visible = useStudio((s) => s.visible);

  if (!open) return null;

  function printReport() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy-950/70 p-6 print:static print:bg-white print:p-0">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-hairline bg-navy-800 shadow-[var(--shadow-panel)] print:max-h-none print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none">
        <header className="flex items-center justify-between border-b border-hairline px-5 py-3 print:border-zinc-300">
          <div>
            <p className="text-title font-medium text-ink print:text-zinc-900">
              {t("reportTitle")}
            </p>
            <p className="text-caption text-slate print:text-zinc-600">
              {t("reportSub")}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={printReport}
              className="h-8 rounded-sm bg-amber px-3 text-caption font-medium text-on-amber"
            >
              {t("printPdf")}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="h-8 rounded-sm border border-hairline px-3 text-caption text-mist hover:bg-lift"
            >
              {t("close")}
            </button>
          </div>
        </header>
        <div className="space-y-4 overflow-y-auto p-5 print:text-zinc-900">
          {media?.kind === "image" ? (
            <img src={media.url} alt="" className="max-h-72 w-full object-contain" />
          ) : (
            <p className="text-ui text-slate">{t("noPhotoHere")}</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-ui">
            {visible.time ? (
              <>
                <dt className="text-slate">{tw("fields.time")}</dt>
                <dd className="font-medium">{fields.time}</dd>
              </>
            ) : null}
            {visible.date ? (
              <>
                <dt className="text-slate">{tw("fields.date")}</dt>
                <dd className="font-medium">{fields.date}</dd>
              </>
            ) : null}
            {visible.weekday ? (
              <>
                <dt className="text-slate">{tw("fields.weekday")}</dt>
                <dd className="font-medium">{fields.weekday}</dd>
              </>
            ) : null}
            {visible.address ? (
              <>
                <dt className="text-slate">{tw("fields.address")}</dt>
                <dd className="font-medium">
                  {fields.address}
                  <br />
                  {fields.city}
                </dd>
              </>
            ) : null}
            {visible.code ? (
              <>
                <dt className="text-slate">{tw("fields.code")}</dt>
                <dd className="font-medium font-mono tracking-wider">{fields.code}</dd>
              </>
            ) : null}
            {visible.brand ? (
              <>
                <dt className="text-slate">{t("tabBrand")}</dt>
                <dd className="font-medium">
                  {fields.brandLy}
                  {fields.brandMark}
                  {fields.complement ? ` · ${fields.complement}` : ""}
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}
