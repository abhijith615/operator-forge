"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import { useIsShiftLive } from "@/hooks/use-mission";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PanelFrameProps {
  title: string;
  eyebrow: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared chrome for the four floor panels, so they read as one instrument. */
export function PanelFrame({
  title,
  eyebrow,
  description,
  actions,
  children,
}: PanelFrameProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing.outExpo }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-2.5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">
            {title}
          </h2>
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-mid">
            {description}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </motion.div>

      <ReadOnlyNotice />

      <div className="mt-7">{children}</div>
    </div>
  );
}

/** Shown once the clock has run out and the panel is a record, not a control. */
function ReadOnlyNotice() {
  const live = useIsShiftLive();
  if (live) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      className="mt-6 flex items-center gap-2.5 rounded-card border border-line bg-white/[0.02] px-4 py-3"
    >
      <Lock className="size-3.5 shrink-0 text-faint" />
      <p className="text-[12.5px] text-lo">
        The shift is over. This is the floor as you left it — nothing here can be
        changed now.
      </p>
    </motion.div>
  );
}

export function StatRow({ items }: { items: { label: React.ReactNode; value: string }[] }) {
  return (
    <div className="mb-5 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div key={index} className="bg-surface px-4 py-3.5">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
            {item.label}
          </p>
          <p
            data-readout
            className="mt-1.5 text-[20px] leading-none font-semibold tracking-[-0.02em] text-hi tabular-nums"
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: "neutral" | "ion" | "warn" | "alert" | "flux" | "ember";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    neutral: "border-line-strong bg-white/[0.04] text-mid",
    ion: "border-ion-500/25 bg-ion-500/10 text-ion-400",
    warn: "border-warn-500/25 bg-warn-500/10 text-warn-500",
    alert: "border-alert-500/25 bg-alert-500/10 text-alert-500",
    flux: "border-flux-500/25 bg-flux-500/10 text-flux-400",
    ember: "border-ember-500/25 bg-ember-500/10 text-ember-400",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap",
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-16 text-center text-[13.5px] text-lo">{children}</div>
  );
}
