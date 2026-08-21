import { cn } from "@/lib/utils";

/**
 * Ambient light behind the page. Three slow-drifting fields — ember low,
 * flux high, ion trailing — so the background never reads as flat black.
 */
export function Aurora({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <div className="absolute -top-1/3 left-1/2 size-[62rem] max-w-none -translate-x-1/2 animate-aurora rounded-full bg-[radial-gradient(circle,rgba(245,196,0,0.16),transparent_62%)] blur-3xl" />
      <div className="absolute top-1/4 -right-1/4 size-[46rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(139,124,255,0.13),transparent_65%)] blur-3xl [animation-delay:-6s]" />
      <div className="absolute -bottom-1/4 -left-1/5 size-[44rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(36,217,181,0.09),transparent_66%)] blur-3xl [animation-delay:-12s]" />
    </div>
  );
}

/** Faint engineering grid. Masked to a radial falloff so edges stay quiet. */
export function GridField({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        "[background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]",
        "[background-size:64px_64px]",
        "[mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent_78%)]",
        className,
      )}
      {...props}
    />
  );
}

/** Horizon line — a single lit hairline where sections meet. */
export function Horizon({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-linear-to-r from-transparent via-line-bright to-transparent",
        className,
      )}
    />
  );
}
