"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  invalid?: boolean;
  /** Rendered inside the field, left of the caret. */
  adornment?: React.ReactNode;
}

export function Input({
  className,
  invalid,
  adornment,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        "group/field relative flex h-12 items-center gap-2.5 rounded-xl px-3.5",
        "border border-line-strong bg-white/[0.025]",
        "transition-[border-color,background-color,box-shadow] duration-200 ease-out-quint",
        "focus-within:border-ember-500/60 focus-within:bg-white/[0.045]",
        "focus-within:shadow-[0_0_0_3px_rgba(255,106,43,0.12)]",
        invalid &&
          "border-alert-500/55 focus-within:border-alert-500/70 focus-within:shadow-[0_0_0_3px_rgba(255,77,94,0.12)]",
        className,
      )}
    >
      {adornment ? (
        <span className="text-lo shrink-0 [&_svg]:size-[18px]">{adornment}</span>
      ) : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          "peer w-full bg-transparent text-[15px] text-hi outline-none",
          "placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50",
          "autofill:bg-transparent",
        )}
        {...props}
      />
    </div>
  );
}
