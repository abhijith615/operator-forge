"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full",
        "border border-line-strong p-[2px] transition-colors duration-200 ease-out-quint",
        "data-[state=unchecked]:bg-white/[0.06]",
        "data-[state=checked]:border-ember-500/50 data-[state=checked]:bg-ember-500/85",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white shadow-sm",
          "transition-transform duration-200 ease-out-quint",
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
