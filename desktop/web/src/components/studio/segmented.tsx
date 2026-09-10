import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  variant = "line",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  variant?: "line" | "pill";
}) {
  if (variant === "pill") {
    return <Pill value={value} onChange={onChange} options={options} />;
  }

  return (
    <div className="flex border-b border-hairline">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "relative h-9 flex-1 text-caption font-medium transition-colors duration-[var(--motion-quick)] ease-[var(--ease-out)]",
              on ? "text-ink" : "text-slate hover:text-mist",
            )}
          >
            {option.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 bottom-0 h-px",
                on ? "bg-amber" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function Pill<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const painted = useRef(false);
  const [hl, setHl] = useState({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const btn = root.querySelector<HTMLElement>(`[data-seg="${value}"]`);
      if (!btn) return;
      setHl({
        x: btn.offsetLeft,
        w: btn.offsetWidth,
        ready: painted.current,
      });
      painted.current = true;
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div
      ref={rootRef}
      className="relative flex shrink-0 rounded-full border border-hairline p-[3px]"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-[3px] h-8 rounded-full bg-ink",
          hl.ready &&
            "transition-[transform,width] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        )}
        style={{ width: hl.w, transform: `translateX(${hl.x}px)` }}
      />
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            data-seg={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative z-10 h-8 rounded-full px-4 text-caption font-medium transition-colors duration-[var(--motion-quick)]",
              on ? "text-navy-900" : "text-slate hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
