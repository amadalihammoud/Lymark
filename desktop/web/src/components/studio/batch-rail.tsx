import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export function BatchRail() {
  const t = useTranslations("app.mesa");
  const mode = useStudio((s) => s.mode);
  const batch = useStudio((s) => s.batch);
  const batchIndex = useStudio((s) => s.batchIndex);
  const batchDone = useStudio((s) => s.batchDone);
  const batchBusy = useStudio((s) => s.batchBusy);
  const selectBatch = useStudio((s) => s.selectBatch);

  if (mode !== "batch" || batch.length === 0) return null;

  return (
    <aside className="flex w-40 shrink-0 flex-col border-s border-hairline bg-navy-900">
      <p className="px-3 py-2 text-micro font-medium uppercase tracking-wider text-slate">
        {t("batch")} · {batch.length}
        {batchBusy ? ` · ${batchDone}/${batch.length}` : ""}
      </p>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {batch.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => selectBatch(i)}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-sm border text-start",
                i === batchIndex
                  ? "border-amber"
                  : "border-hairline hover:border-mist",
              )}
            >
              {item.kind === "image" ? (
                <img
                  src={item.url}
                  alt=""
                  className="h-16 w-full object-cover"
                />
              ) : (
                <div className="flex h-16 items-center justify-center bg-navy-800 text-micro text-slate">
                  {t("video")}
                </div>
              )}
              <span className="truncate px-1.5 py-1 text-micro text-mist">
                {item.name}
              </span>
              {item.existingCode ? (
                <span className="px-1.5 pb-1 font-mono text-micro text-amber">
                  {t("alreadyStamped")}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
