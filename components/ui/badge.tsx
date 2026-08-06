import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line-strong bg-white/[0.04] text-mid",
        ember: "border-ember-500/25 bg-ember-500/10 text-ember-400",
        ion: "border-ion-500/25 bg-ion-500/10 text-ion-400",
        flux: "border-flux-500/25 bg-flux-500/10 text-flux-400",
        alert: "border-alert-500/25 bg-alert-500/10 text-alert-500",
        warn: "border-warn-500/25 bg-warn-500/10 text-warn-500",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
