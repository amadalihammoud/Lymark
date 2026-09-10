import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 38"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <circle cx="19" cy="19" r="19" className="fill-navy-400" />
      <rect x="12" y="10.2" width="4.2" height="17.5" className="fill-ink" />
      <rect x="12" y="23.5" width="10.8" height="4.2" className="fill-ink" />
      <rect x="26.2" y="10.2" width="3" height="17.5" className="fill-amber" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <Mark />
      <span
        className={cn(
          "font-semibold tracking-wide",
          compact ? "text-title" : "text-lg",
        )}
      >
        Ly<span className="text-amber">mark</span>
      </span>
    </span>
  );
}
