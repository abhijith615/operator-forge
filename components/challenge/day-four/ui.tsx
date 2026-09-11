"use client";

import * as React from "react";

import { AnimatedNumber, AnimatedPercent } from "@/components/challenge/day-three/ui";
import type { FloorMetrics } from "@/lib/challenge/day-four/floor";
import { cn } from "@/lib/utils";

/**
 * The five numbers Day 4 keeps in view. Compact on purpose — the floor map is
 * where the information is; this strip is how you know it is changing.
 */
export function FlowMetrics({ metrics, compact = false }: { metrics: FloorMetrics; compact?: boolean }) {
  const congestionTone =
    metrics.congestion >= 1 ? "text-alert-500" : metrics.congestion >= 0.7 ? "text-warn-500" : "text-ion-400";
  const access = 1 - metrics.aisleBlocked;
  const accessTone = access >= 0.9 ? "text-ion-400" : access >= 0.6 ? "text-warn-500" : "text-alert-500";
  const readyTone = metrics.pickReadyInbound >= 0.8 ? "text-ion-400" : metrics.pickReadyInbound >= 0.4 ? "text-warn-500" : "text-lo";
  const ctdTone = metrics.ctd > 180 ? "text-alert-500" : metrics.ctd > 170 ? "text-warn-500" : "text-ion-400";

  const cells = [
    { label: compact ? "Floor" : "Floor congestion", node: <AnimatedPercent value={metrics.congestion} className={congestionTone} /> },
    { label: compact ? "Pick-ready" : "Pick-ready inbound", node: <AnimatedPercent value={metrics.pickReadyInbound} className={readyTone} /> },
    { label: compact ? "Aisle" : "Aisle access", node: <AnimatedPercent value={access} className={accessTone} /> },
    {
      label: "CTD",
      node: <AnimatedNumber value={metrics.ctd} format={(n) => `${n}s`} className={ctdTone} />,
    },
    {
      label: compact ? "Pending" : "Pending receiving",
      node: <AnimatedNumber value={metrics.pendingBatches} className="text-hi" />,
    },
  ];

  return (
    <dl className={cn("grid grid-cols-5", compact ? "gap-2" : "gap-3")}>
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0">
          <dt className="truncate font-mono text-[9px] tracking-[0.12em] text-faint uppercase">{cell.label}</dt>
          <dd className={cn("font-semibold leading-none", compact ? "mt-0.5 text-[13px]" : "mt-1 text-[16px]")}>
            {cell.node}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "86% → 18%" with each side toned. */
export function FromTo({
  from,
  to,
  unit = "%",
  better = "down",
  className,
}: {
  from: number;
  to: number;
  unit?: string;
  better?: "down" | "up";
  className?: string;
}) {
  const improved = better === "down" ? to < from : to > from;
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-mono font-semibold tabular-nums", className)}>
      <span className="text-lo">
        {from}
        {unit}
      </span>
      <span className="text-faint">→</span>
      <span className={improved ? "text-ion-400" : to === from ? "text-hi" : "text-alert-500"}>
        {to}
        {unit}
      </span>
    </span>
  );
}

/** A short line from someone on the floor. */
export function FloorVoice({ from, time, lines, tone = "ember" }: { from: string; time: string; lines: string[]; tone?: "ember" | "alert" }) {
  return (
    <div
      className={cn(
        "rounded-card border p-3.5",
        tone === "alert" ? "border-alert-500/40 bg-alert-500/[0.05]" : "border-ember-500/35 bg-ember-500/[0.05]",
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className={tone === "alert" ? "text-alert-500" : "text-ember-500"}>{from}</span>
        <span className="ml-auto text-faint">{time}</span>
      </p>
      <div className="mt-1.5 space-y-0.5">
        {lines.map((line) => (
          <p key={line} className="text-[14px] leading-relaxed text-hi">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function StageHeading({
  time,
  eyebrow,
  title,
  sub,
  tone = "ember",
}: {
  time: string;
  eyebrow: string;
  title: string;
  sub?: string;
  tone?: "ember" | "alert" | "ion";
}) {
  return (
    <div>
      <p
        className={cn(
          "font-mono text-[10px] tracking-[0.2em] uppercase",
          tone === "alert" ? "text-alert-500" : tone === "ion" ? "text-ion-400" : "text-ember-500",
        )}
      >
        {time} · {eyebrow}
      </p>
      <h2 className="mt-1.5 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[21px]">{title}</h2>
      {sub ? <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-mid">{sub}</p> : null}
    </div>
  );
}
