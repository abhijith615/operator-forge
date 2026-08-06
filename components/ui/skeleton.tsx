import { cn } from "@/lib/utils";

/** Loading state that reads as "instrument warming up", not "page broken". */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.045]",
        "after:absolute after:inset-0 after:animate-shimmer",
        "after:bg-linear-100 after:from-transparent after:via-white/[0.07] after:to-transparent",
        "after:bg-[length:220%_100%]",
        className,
      )}
      {...props}
    />
  );
}
