import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useTranslations } from "use-intl";

import { hexToHsv, hsvToHex, isStampSwatch, parseHex, STAMP_SWATCHES, type Hsv } from "@/lib/color";
import { cn } from "@/lib/utils";

export function ColorField({
  label,
  value,
  onChange,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  hideLabel?: boolean;
}) {
  const t = useTranslations("app.watermark");
  const tPicker = useTranslations("app.colorPicker");
  const tWeb = useTranslations("app.web");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const hex = parseHex(value) ?? value.toUpperCase();
  const isSwatch = isStampSwatch(hex);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", hideLabel ? undefined : "space-y-1.5")}>
      {hideLabel ? null : (
        <p className="text-micro font-medium uppercase tracking-wider text-slate">{label}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {STAMP_SWATCHES.map((swatch) => {
          const selected = swatch.hex === hex;
          const colorName =
            swatch.hex === "#FFFFFF"
              ? t("colors.white")
              : swatch.hex === "#F3C218"
                ? t("colors.amber")
                : swatch.hex === "#FF6B57"
                  ? t("colors.red")
                  : swatch.hex === "#5BD98A"
                    ? t("colors.green")
                    : swatch.hex === "#63B3ED"
                      ? t("colors.blue")
                      : t("colors.black");
          return (
            <button
              key={swatch.hex}
              type="button"
              aria-label={`${label}: ${colorName}`}
              aria-pressed={selected}
              onClick={() => {
                onChange(swatch.hex);
                setOpen(false);
              }}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-sm border-2 p-[2px]",
                selected && !open ? "border-amber" : "border-transparent",
              )}
            >
              <span
                className="h-full w-full rounded-xs border border-hairline"
                style={{ backgroundColor: swatch.hex }}
              />
            </button>
          );
        })}
        <button
          type="button"
          aria-label={open ? `${label}: ${tWeb("close")}` : `${label}: ${tPicker("other")}`}
          aria-pressed={open || !isSwatch}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-sm border-2 p-[2px]",
            open || !isSwatch ? "border-amber" : "border-transparent",
          )}
        >
          <span
            className={cn(
              "flex h-full w-full items-center justify-center rounded-xs border border-hairline font-sans text-caption font-bold text-ink",
              isSwatch && !open && "bg-lift",
            )}
            style={isSwatch && !open ? undefined : { backgroundColor: hex }}
          >
            {isSwatch && !open ? "+" : null}
          </span>
        </button>
      </div>
      {open ? (
        <InlinePicker value={hex} onChange={onChange} />
      ) : null}
    </div>
  );
}

function InlinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const tWeb = useTranslations("app.web");
  const seed = hexToHsv(value);
  const [hsv, setHsv] = useState<Hsv>(seed);
  const [hexDraft, setHexDraft] = useState(hsvToHex(seed));

  const apply = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexDraft(hex);
    onChange(hex);
  };

  const setFromHex = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^#0-9A-F]/g, "").slice(0, 7);
    const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    setHexDraft(withHash);
    const parsed = parseHex(cleaned);
    if (parsed) {
      setHsv(hexToHsv(parsed));
      onChange(parsed);
    }
  };

  return (
    <div className="absolute inset-x-0 top-full z-20 mt-2 space-y-2 border border-hairline bg-navy-800 p-2">
      <SvSquare hsv={hsv} onChange={apply} />
      <HueBar hsv={hsv} onChange={apply} />
      <div className="flex items-center gap-2">
        <span
          className="size-7 shrink-0 rounded-sm border border-hairline"
          style={{ backgroundColor: hsvToHex(hsv) }}
          aria-hidden
        />
        <input
          value={hexDraft}
          onChange={(event) => setFromHex(event.target.value)}
          spellCheck={false}
          className="field min-w-0 flex-1 font-mono tracking-wider"
          aria-label={tWeb("hexColor")}
        />
      </div>
    </div>
  );
}

function SvSquare({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
}) {
  const tPicker = useTranslations("app.colorPicker");
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  return (
    <PointerPad
      className="h-32 overflow-hidden rounded-sm"
      ariaLabel={tPicker("saturationBrightness")}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgb(0 0 0 / 0), #000), linear-gradient(to right, #fff, ${hueHex})`,
      }}
      onRatio={(x, y) => onChange({ ...hsv, s: x, v: 1 - y })}
    >
      <span
        className="pointer-events-none absolute size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink shadow-[0_0_0_1px_rgb(0_0_0_/_0.55)]"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </PointerPad>
  );
}

function HueBar({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
}) {
  const tPicker = useTranslations("app.colorPicker");
  return (
    <PointerPad
      className="h-8 overflow-hidden rounded-sm"
      ariaLabel={tPicker("hue")}
      style={{
        backgroundImage:
          "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)",
      }}
      onRatio={(x) => onChange({ ...hsv, h: x * 360 })}
    >
      <span
        className="pointer-events-none absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink shadow-[0_0_0_1px_rgb(0_0_0_/_0.55)]"
        style={{ left: `${(hsv.h / 360) * 100}%` }}
      />
    </PointerPad>
  );
}

function PointerPad({
  className,
  style,
  ariaLabel,
  onRatio,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
  onRatio: (x: number, y: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    onRatio(x, y);
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn("relative touch-none select-none", className)}
      style={style}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        apply(event);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        apply(event);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {children}
    </div>
  );
}
