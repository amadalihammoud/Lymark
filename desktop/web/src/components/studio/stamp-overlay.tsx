import { useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { FieldKey, StampCorner } from "@/store/studio";
import { formatPlace, parsePlace, useStudio } from "@/store/studio";

const SIZE = {
  sm: { clock: "text-3xl", body: "text-micro", code: "text-micro", gap: "gap-0.5", logo: 22 },
  md: { clock: "text-5xl", body: "text-caption", code: "text-micro", gap: "gap-1", logo: 32 },
  lg: { clock: "text-6xl", body: "text-ui", code: "text-caption", gap: "gap-1.5", logo: 44 },
} as const;

function Editable({
  field,
  className,
  style,
  children,
}: {
  field: FieldKey;
  className?: string;
  style?: React.CSSProperties;
  children: string;
}) {
  const editing = useStudio((s) => s.editing);
  const setEditing = useStudio((s) => s.setEditing);
  const setField = useStudio((s) => s.setField);
  const setPlace = useStudio((s) => s.setPlace);
  const fields = useStudio((s) => s.fields);

  if (editing === field) {
    const value =
      field === "address"
        ? formatPlace(fields.address, fields.city)
        : field === "brand"
          ? `${fields.brandLy}${fields.brandMark}`
          : String(fields[field as keyof typeof fields] ?? "");
    const box = cn(
      "min-w-16 bg-navy-900/80 text-ink outline-none ring-1 ring-amber/70 rounded-xs px-1 py-0.5",
      className,
    );
    if (field === "address") {
      const lines = Math.min(4, Math.max(2, value.split("\n").length));
      return (
        <textarea
          autoFocus
          rows={lines}
          value={value}
          onChange={(e) => {
            const next = parsePlace(e.target.value);
            setPlace({ ...next, source: "manual" });
          }}
          onBlur={() => setEditing(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(null);
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              setEditing(null);
            }
          }}
          className={cn(box, "block w-full max-w-72 resize-none leading-snug")}
        />
      );
    }
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => {
          if (field === "time") setField("time", e.target.value);
          else if (field === "date") setField("date", e.target.value);
          else if (field === "weekday") setField("weekday", e.target.value);
          else if (field === "code") setField("code", e.target.value);
          else if (field === "brand") {
            const v = e.target.value;
            const cut = Math.max(1, Math.ceil(v.length / 2));
            setField("brandLy", v.slice(0, cut));
            setField("brandMark", v.slice(cut));
          }
        }}
        onBlur={() => setEditing(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(null);
        }}
        className={cn(
          "min-w-16 bg-navy-900/80 text-ink outline-none ring-1 ring-amber/70 rounded-xs px-1 py-0.5",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(field);
      }}
      className={cn(
        "rounded-xs px-0.5 text-left hover:ring-1 hover:ring-amber/50",
        field === "address" && "whitespace-pre-wrap",
        className,
      )}
      style={style}
    >
      {children}
    </button>
  );
}

function LogoMark({ height }: { height: number }) {
  const logoUrl = useStudio((s) => s.logoUrl);
  const logoScale = useStudio((s) => s.logoScale);
  if (!logoUrl) return null;
  return (
    <img
      src={logoUrl}
      alt=""
      className="object-contain"
      style={{ height, width: "auto", maxWidth: height * 2.4 * logoScale }}
    />
  );
}

export function StampOverlay() {
  const t = useTranslations("app.web");
  const fields = useStudio((s) => s.fields);
  const visible = useStudio((s) => s.visible);
  const corner = useStudio((s) => s.corner);
  const size = useStudio((s) => s.size);
  const codePlacement = useStudio((s) => s.codePlacement);
  const band = useStudio((s) => s.band);
  const ink = useStudio((s) => s.ink);
  const accent = useStudio((s) => s.accent);
  const colorA = useStudio((s) => s.colorA);
  const colorB = useStudio((s) => s.colorB);
  const logoAt = useStudio((s) => s.logoAt);
  const logoUrl = useStudio((s) => s.logoUrl);
  const logoScale = useStudio((s) => s.logoScale);
  const editing = useStudio((s) => s.editing);
  const setEditing = useStudio((s) => s.setEditing);
  const setCorner = useStudio((s) => s.setCorner);
  const s = SIZE[size];
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const [dragging, setDragging] = useState(false);

  const top = corner.startsWith("top");
  const right = corner.endsWith("right");
  const logoH = Math.round(s.logo * logoScale);

  const logoCorner = logoAt !== "block" && logoUrl;
  const logoTop = logoAt.startsWith("top");
  const logoRight = logoAt.endsWith("right");

  const snapFromPoint = (clientX: number, clientY: number) => {
    const el = layer.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    const next: StampCorner = `${ny < 0.5 ? "top" : "bottom"}-${nx < 0.5 ? "left" : "right"}`;
    if (next !== useStudio.getState().corner) setCorner(next);
  };

  const onDragPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(null);
    drag.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    snapFromPoint(e.clientX, e.clientY);
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    snapFromPoint(e.clientX, e.clientY);
  };

  const onDragPointerUp = () => {
    drag.current = false;
    setDragging(false);
  };

  return (
    <div ref={layer} className="pointer-events-none absolute inset-0">
      {logoCorner ? (
        <div
          className={cn(
            "absolute",
            logoTop ? "top-3" : "bottom-3",
            logoRight ? "right-4" : "left-4",
          )}
        >
          <LogoMark height={logoH} />
        </div>
      ) : null}

      {visible.code && codePlacement === "side" ? (
        <div
          className={cn(
            "pointer-events-auto absolute top-1/2 origin-center -translate-y-1/2 -rotate-90 font-mono font-medium tracking-widest stamp-ink",
            s.code,
            right ? "left-3" : "right-3",
          )}
          style={{ color: ink }}
        >
          <Editable field="code" className={cn("font-mono tracking-widest", s.code)}>
            {fields.code}
          </Editable>
        </div>
      ) : null}

      <div
        data-stamp
        className={cn(
          "pointer-events-auto absolute flex max-w-sm flex-col stamp-ink group",
          s.gap,
          band && "rounded-sm bg-navy-900/55 px-3 py-2",
          top ? "top-4" : "bottom-4",
          right ? "right-4 items-end text-right" : "left-4 items-start text-left",
          dragging && "cursor-grabbing",
        )}
        style={{ color: ink }}
      >
        <button
          type="button"
          aria-label={t("moveStamp")}
          title={t("moveStamp")}
          className={cn(
            "absolute z-10 flex size-3 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100",
            top ? "-top-1.5" : "-bottom-1.5",
            right ? "-right-1.5" : "-left-1.5",
            dragging ? "cursor-grabbing opacity-100" : "cursor-grab",
          )}
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
        >
          <span className="size-1.5 border border-amber bg-navy-900" />
        </button>
        {visible.brand ? (
          <div className={cn("flex items-center", s.gap, right ? "flex-row-reverse" : "flex-row")}>
            {logoAt === "block" ? <LogoMark height={logoH} /> : null}
            <div className={cn("flex flex-col", right ? "items-end" : "items-start")}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing("brand");
                }}
                className="font-stamp text-caption font-medium tracking-wide"
              >
                {editing === "brand" ? (
                  <Editable field="brand" className="font-stamp text-caption font-medium">
                    {`${fields.brandLy}${fields.brandMark}`}
                  </Editable>
                ) : (
                  <>
                    <span style={{ color: colorA }}>{fields.brandLy}</span>
                    <span style={{ color: colorB }}>{fields.brandMark}</span>
                  </>
                )}
              </button>
              {fields.complement ? (
                <span className={cn("font-stamp font-medium opacity-90", s.body)}>
                  {fields.complement}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {visible.time ? (
          <div className={cn("flex items-start", right && "flex-row-reverse")}>
            <Editable
              field="time"
              className={cn("font-clock leading-none tracking-tight", s.clock)}
              style={{ color: ink }}
            >
              {fields.time}
            </Editable>
            <span
              className={cn(
                "mt-[0.28em] w-0.5 shrink-0",
                right ? "mr-1.5" : "ml-1.5",
                size === "lg" ? "h-10" : size === "sm" ? "h-6" : "h-8",
              )}
              style={{ backgroundColor: accent }}
            />
            <div
              className={cn(
                "mt-[0.28em] flex flex-col justify-between font-stamp font-medium",
                s.body,
                right ? "mr-1.5 items-end" : "ml-1.5",
                size === "lg" ? "h-10" : size === "sm" ? "h-6" : "h-8",
              )}
            >
              {visible.date ? (
                <Editable field="date" className={s.body}>
                  {fields.date}
                </Editable>
              ) : (
                <span />
              )}
              {visible.weekday ? (
                <Editable field="weekday" className={s.body}>
                  {fields.weekday}
                </Editable>
              ) : (
                <span />
              )}
            </div>
          </div>
        ) : (
          <div className={cn("flex flex-col font-stamp font-medium", s.body, s.gap)}>
            {visible.date ? <Editable field="date">{fields.date}</Editable> : null}
            {visible.weekday ? (
              <Editable field="weekday">{fields.weekday}</Editable>
            ) : null}
          </div>
        )}

        {visible.address ? (
          <Editable
            field="address"
            className={cn("block max-w-72 font-stamp font-medium leading-snug", s.body)}
          >
            {formatPlace(fields.address, fields.city)}
          </Editable>
        ) : null}

        {visible.code && codePlacement === "block" ? (
          <Editable
            field="code"
            className={cn("font-mono font-medium tracking-widest", s.code)}
          >
            {fields.code}
          </Editable>
        ) : null}
      </div>
    </div>
  );
}
