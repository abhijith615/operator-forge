"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "ember" | "ion" | "flux" | "warn" | "alert";

const TONE: Record<MetricTone, { icon: string; glow: string }> = {
  neutral: { icon: "text-lo", glow: "" },
  ember: { icon: "text-ember-500", glow: "shadow-[inset_0_1px_0_0_rgba(255,106,43,0.18)]" },
  ion: { icon: "text-ion-400", glow: "shadow-[inset_0_1px_0_0_rgba(36,217,181,0.18)]" },
  flux: { icon: "text-flux-400", glow: "shadow-[inset_0_1px_0_0_rgba(139,124,255,0.18)]" },
  warn: { icon: "text-warn-500", glow: "shadow-[inset_0_1px_0_0_rgba(255,191,61,0.2)]" },
  alert: { icon: "text-alert-500", glow: "shadow-[inset_0_1px_0_0_rgba(255,77,94,0.22)]" },
};

interface MetricTileProps {
  label: React.ReactNode;
  value: string | number;
  unit?: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  className?: string;
}

/** One instrument. The value rolls when it changes so movement is legible. */
export function MetricTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: MetricTileProps) {
  const style = TONE[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface p-4",
        "transition-colors duration-500",
        style.glow,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5 shrink-0", style.icon)} />
        <span className="truncate text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1 overflow-hidden">
        <motion.span
          key={String(value)}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          transition={{ duration: 0.45, ease: easing.outExpo }}
          data-readout
          className="text-[26px] leading-none font-semibold tracking-[-0.035em] text-hi tabular-nums"
        >
          {value}
        </motion.span>
        {unit ? <span className="text-[13px] text-lo">{unit}</span> : null}
      </div>

      {hint ? (
        <p className="mt-2 truncate text-[11.5px] text-lo">{hint}</p>
      ) : null}
    </div>
  );
}
