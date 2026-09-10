import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-[background-color,color,opacity,transform] duration-150 ease-[var(--ease-out)] select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:pointer-events-none disabled:opacity-40 active:scale-[0.96]",
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-mist hover:bg-lift hover:text-ink",
        quiet:
          "border border-hairline bg-transparent text-mist hover:bg-lift hover:text-ink",
        solid:
          "bg-lift text-ink hover:bg-hairline",
        accent:
          "bg-amber text-on-amber hover:bg-amber-dark",
      },
      size: {
        sm: "h-8 px-2.5 text-caption",
        md: "h-10 px-4 text-body",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
