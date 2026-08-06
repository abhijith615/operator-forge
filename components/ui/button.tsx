"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium select-none isolate",
    "transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out-quint",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:shrink-0 [&_svg]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-white rounded-full",
          "bg-linear-to-b from-ember-400 to-ember-600",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.28)_inset,0_8px_24px_-8px_rgba(255,106,43,0.65)]",
          "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.34)_inset,0_12px_34px_-8px_rgba(255,106,43,0.85)]",
          "hover:brightness-[1.06]",
        ],
        secondary: [
          "rounded-full text-hi border border-line-strong",
          "bg-white/[0.045] hover:bg-white/[0.08] hover:border-line-bright",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]",
        ],
        ghost: "rounded-full text-mid hover:text-hi hover:bg-white/[0.06]",
        outline:
          "rounded-full border border-line-strong text-mid hover:text-hi hover:border-ember-500/50 hover:bg-ember-500/[0.07]",
        danger:
          "rounded-full text-alert-500 border border-alert-500/25 bg-alert-500/[0.08] hover:bg-alert-500/[0.14]",
        link: "text-mid hover:text-hi underline-offset-4 hover:underline rounded-sm",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[15px]",
        icon: "size-9 rounded-full px-0",
        "icon-sm": "size-8 rounded-full px-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? (asChild ? undefined : loading)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          <span className="sr-only">Working</span>
          <span aria-hidden className="opacity-70">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
