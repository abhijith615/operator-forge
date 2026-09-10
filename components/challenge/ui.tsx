"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Info,
  Minus,
  type LucideIcon,
} from "lucide-react";

import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Metrics, SceneId } from "@/lib/challenge/types";
import { PLAYABLE_SCENES } from "@/lib/challenge/types";

/* ── Status ───────────────────────────────────────────────────────────── */

export type Status = "neutral" | "healthy" | "warning" | "critical";

/**
 * Status is always carried by an icon and a word as well as a colour. Nobody
 * should have to distinguish amber from red to know the store is in trouble.
 */
const STATUS: Record<Status, { icon: LucideIcon; text: string; ring: string; label: string }> = {
  neutral: { icon: Info, text: "text-mid", ring: "border-line-strong", label: "Steady" },
  healthy: { icon: CheckCircle2, text: "text-ion-400", ring: "border-ion-500/35", label: "Healthy" },
  warning: { icon: AlertTriangle, text: "text-warn-500", ring: "border-warn-500/40", label: "Watch" },
  critical: { icon: AlertTriangle, text: "text-alert-500", ring: "border-alert-500/45", label: "Critical" },
};

export function StatusPill({ status, children }: { status: Status; children?: React.ReactNode }) {
  const { icon: Icon, text, ring, label } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
        ring,
        text,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children ?? label}
    </span>
  );
}

/* ── Shift header ─────────────────────────────────────────────────────── */

export function ShiftHeader({
  simulatedTime,
  scene,
  label,
}: {
  simulatedTime: string;
  scene: SceneId;
  label: string;
}) {
  // "complete" is not a playable stage, so indexOf returns -1 and every dot
  // would read as unreached on the one screen where the shift is finished.
  const index =
    scene === "complete" ? PLAYABLE_SCENES.length - 1 : PLAYABLE_SCENES.indexOf(scene);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-obsidian/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p
            data-readout
            className="font-mono text-[15px] leading-none font-semibold text-hi tabular-nums"
          >
            {simulatedTime}
          </p>
          <p className="mt-1 truncate text-[11px] text-lo">{label}</p>
        </div>

        <div className="ml-auto text-right">
          <p className="font-mono text-[9.5px] tracking-[0.16em] text-faint uppercase">
            Shift progress
          </p>
          <div className="mt-1.5 flex items-center justify-end gap-1.5" role="img"
            aria-label={`Shift progress: ${Math.max(0, index + 1)} of ${PLAYABLE_SCENES.length} stages`}>
            {PLAYABLE_SCENES.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-300",
                  i <= index ? "bg-ember-500" : "bg-white/15",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Metrics ──────────────────────────────────────────────────────────── */

interface MetricSpec {
  key: keyof Metrics;
  label: string;
  format: (value: number) => string;
  /** Lower is better for most of these. */
  better: "lower" | "higher";
  statusOf?: (value: number) => Status;
}

export const METRIC_SPECS: MetricSpec[] = [
  {
    key: "ctd",
    label: "Click → Dispatch",
    format: (v) => `${v}s`,
    better: "lower",
    statusOf: (v) => (v < 165 ? "healthy" : v <= 180 ? "neutral" : v <= 200 ? "warning" : "critical"),
  },
  { key: "ordersWaiting", label: "Orders waiting", format: (v) => `${v}`, better: "lower" },
  {
    key: "packingQueue",
    label: "Packing queue",
    format: (v) => `${v}`,
    better: "lower",
    statusOf: (v) => (v <= 4 ? "healthy" : v <= 6 ? "neutral" : v <= 8 ? "warning" : "critical"),
  },
  {
    key: "nilPicks",
    label: "Nil picks",
    format: (v) => `${v}`,
    better: "lower",
    statusOf: (v) => (v === 0 ? "healthy" : v === 1 ? "warning" : "critical"),
  },
  { key: "ridersWaiting", label: "Riders waiting", format: (v) => `${v}`, better: "lower" },
  {
    key: "pickingCapacity",
    label: "Picking capacity",
    format: (v) => `${v}%`,
    better: "higher",
    statusOf: (v) => (v >= 95 ? "healthy" : v >= 85 ? "neutral" : "warning"),
  },
];

function Delta({ value, better }: { value: number; better: "lower" | "higher" }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-faint">
        <Minus className="size-3" aria-hidden />
        <span className="sr-only">no change</span>
      </span>
    );
  }
  const good = better === "lower" ? value < 0 : value > 0;
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        good ? "text-ion-400" : "text-alert-500",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {Math.abs(value)}
      <span className="sr-only">
        {value > 0 ? "up" : "down"} {Math.abs(value)}, {good ? "improving" : "worsening"}
      </span>
    </span>
  );
}

export function MetricsBoard({
  metrics,
  previous,
  compact = false,
}: {
  metrics: Metrics;
  previous?: Metrics | null;
  compact?: boolean;
}) {
  const specs = compact ? METRIC_SPECS.slice(0, 4) : METRIC_SPECS;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {specs.map((spec) => {
        const value = metrics[spec.key];
        const delta = previous ? value - previous[spec.key] : 0;
        const status = spec.statusOf?.(value) ?? "neutral";
        const tone = STATUS[status];

        return (
          <div
            key={spec.key}
            className={cn(
              "rounded-card border bg-surface p-3",
              status === "neutral" ? "border-line" : tone.ring,
            )}
          >
            <p className="text-[10px] leading-tight font-medium tracking-[0.08em] text-lo uppercase">
              {spec.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                data-readout
                className={cn(
                  "text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
                  status === "neutral" ? "text-hi" : tone.text,
                )}
              >
                {spec.format(value)}
              </span>
              {previous ? <Delta value={delta} better={spec.better} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Internal message ─────────────────────────────────────────────────── */

export function InternalMessage({
  from,
  time,
  children,
}: {
  from: string;
  time: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className="rounded-card border border-line-strong bg-elevated p-4"
    >
      <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">
        {from} · {time}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-hi">{children}</p>
    </motion.div>
  );
}

/* ── Action cards ─────────────────────────────────────────────────────── */

export function ActionCard({
  label,
  detail,
  selected = false,
  disabled = false,
  index,
  onSelect,
}: {
  label: string;
  detail?: string;
  selected?: boolean;
  disabled?: boolean;
  /** Shown as a slot number when the card is part of an ordered plan. */
  index?: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-card border p-4 text-left transition-colors duration-200",
        "min-h-[64px] focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian focus-visible:outline-none",
        selected
          ? "border-ember-500/60 bg-ember-500/[0.09]"
          : "border-line bg-surface hover:border-ember-500/40 hover:bg-white/[0.03]",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <span className="flex items-start gap-3">
        {index !== undefined ? (
          <span
            className={cn(
              "mt-px grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold tabular-nums",
              selected
                ? "border-ember-500 bg-ember-500 text-void"
                : "border-line-strong text-faint",
            )}
          >
            {selected ? index : "·"}
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block text-[14px] leading-snug font-medium text-hi">{label}</span>
          {detail ? (
            <span className="mt-1 block text-[12.5px] leading-relaxed text-mid">{detail}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

/* ── Consequence ──────────────────────────────────────────────────────── */

export function Consequence({
  status,
  headline,
  body,
  children,
}: {
  status: Status;
  headline: string;
  body: string;
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const tone = STATUS[status];
  const Icon = tone.icon;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      role="status"
      aria-live="polite"
      className={cn("rounded-card border bg-surface p-4", tone.ring)}
    >
      <p className={cn("flex items-center gap-2 text-[13px] font-semibold", tone.text)}>
        <Icon className="size-4 shrink-0" aria-hidden />
        {headline}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-mid">{body}</p>
      {children}
    </motion.div>
  );
}

/* ── Scene frame ──────────────────────────────────────────────────────── */

export function SceneFrame({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className="space-y-4"
    >
      <div>
        <p className="font-mono text-[10px] tracking-[0.18em] text-ember-500 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-[21px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[24px]">
          {title}
        </h1>
      </div>
      {children}
    </motion.div>
  );
}

/** Sticky on mobile so the primary action is always one thumb away. */
export function StickyAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-obsidian/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}
