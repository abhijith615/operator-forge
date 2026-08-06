import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1.5",
        "border border-line-strong bg-white/[0.05]",
        "font-mono text-[10px] leading-none font-medium text-lo",
        className,
      )}
      {...props}
    />
  );
}
