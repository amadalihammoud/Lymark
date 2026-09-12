import { cn } from "@/lib/utils";

/**
 * O monograma "LY" da marca, em SVG embutido.
 *
 * Os caminhos são os do pacote `assets/brand/` (fonte da verdade, copiados
 * literalmente). As cores também: branco no L, âmbar #E09A04 no Y — o token
 * do pacote, e não o `--color-amber` da interface, porque a marca tem a sua
 * própria cor e não muda com o tema.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="10 -6.5 319.75 251"
      className={cn("h-7 w-auto", className)}
      aria-hidden="true"
    >
      <path d="M48 31.5H86V174.5H168.5V206.5H48Z" fill="#FFFFFF" />
      <path
        d="M121.25 31.5H163.25L193.4 79.74Q200.9 91.74 193.4 103.74L190.15 108.96C188.16 112.14 184.72 117.32 182.09 125.92L180.4 126.14Z"
        fill="#E09A04"
      />
      <path
        d="M249.75 31.5H291.75L233.94 124Q225.5 137.5 225.5 152V206.5H187.5V152Q187.5 131.1 198.2 114Z"
        fill="#E09A04"
      />
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
