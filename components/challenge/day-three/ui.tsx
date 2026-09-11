"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

import { COVER_LABEL, COVER_SHORT, type CoverLane, type Skill, type Station, type Worker } from "@/lib/challenge/day-three/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ── Coverage tone ────────────────────────────────────────────────────── */

export type CoverTone = "ok" | "tight" | "short";

export function coverTone(value: number): CoverTone {
  if (value >= 0.97) return "ok";
  if (value >= 0.88) return "tight";
  return "short";
}

export const TONE_TEXT: Record<CoverTone, string> = {
  ok: "text-ion-400",
  tight: "text-warn-500",
  short: "text-alert-500",
};

export const TONE_BAR: Record<CoverTone, string> = {
  ok: "bg-ion-500",
  tight: "bg-warn-500",
  short: "bg-alert-500",
};

export const TONE_RING: Record<CoverTone, string> = {
  ok: "border-ion-500/40",
  tight: "border-warn-500/45",
  short: "border-alert-500/50",
};

export const STATION_LETTER: Record<Station, string> = {
  picking: "P",
  packing: "K",
  dispatch: "D",
};

/* ── Numbers that move ────────────────────────────────────────────────── */

/**
 * A percentage that animates between values. The whole reward of Day 3 is
 * watching a red number climb, so the number has to be seen climbing.
 */
export function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const target = Math.round(value * 100);
  const [display, setDisplay] = React.useState(target);
  const previous = React.useRef(target);

  React.useEffect(() => {
    if (previous.current === target) return;
    const from = previous.current;
    previous.current = target;
    if (reduced) {
      setDisplay(target);
      return;
    }
    const controls = animate(from, target, {
      duration: 0.6,
      ease: easing.outExpo,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, reduced]);

  return (
    <span data-readout className={cn("tabular-nums", className)}>
      {display}%
    </span>
  );
}

export function AnimatedNumber({
  value,
  className,
  format = (n: number) => String(n),
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const previous = React.useRef(value);

  React.useEffect(() => {
    if (previous.current === value) return;
    const from = previous.current;
    previous.current = value;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: easing.outExpo,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span data-readout className={cn("tabular-nums", className)}>
      {format(display)}
    </span>
  );
}

/* ── Coverage meter ───────────────────────────────────────────────────── */

/**
 * One lane's coverage. The bar runs to 130% so over-coverage is visible as
 * over-coverage rather than as a full bar, with a tick where 100% sits.
 */
export function CoverageMeter({
  lane,
  value,
  compact = false,
  label,
}: {
  lane: CoverLane;
  value: number;
  compact?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const tone = coverTone(value);
  const width = Math.max(2, Math.min(100, (value / 1.3) * 100));

  if (compact) {
    return (
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-1.5">
          <span className="truncate font-mono text-[9px] tracking-[0.12em] text-faint uppercase">
            {label ?? COVER_SHORT[lane]}
          </span>
          <AnimatedPercent value={value} className={cn("text-[13px] font-semibold", TONE_TEXT[tone])} />
        </div>
        <div className="relative mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className={cn("h-full rounded-full", TONE_BAR[tone])}
            initial={false}
            animate={{ width: `${width}%` }}
            transition={{ duration: reduced ? 0 : 0.5, ease: easing.outExpo }}
          />
          <span aria-hidden className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${100 / 1.3}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 rounded-card border bg-surface p-3", TONE_RING[tone])}>
      {/* Stacked on a phone, where three of these share 375px. */}
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <span className="max-w-full truncate font-mono text-[9.5px] tracking-[0.12em] text-lo uppercase sm:text-[10px]">
          {label ?? COVER_LABEL[lane]}
        </span>
        <AnimatedPercent
          value={value}
          className={cn("text-[18px] leading-none font-semibold sm:text-[20px]", TONE_TEXT[tone])}
        />
      </div>
      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={cn("h-full rounded-full", TONE_BAR[tone])}
          initial={false}
          animate={{ width: `${width}%` }}
          transition={{ duration: reduced ? 0 : 0.5, ease: easing.outExpo }}
        />
        <span aria-hidden className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${100 / 1.3}%` }} />
      </div>
    </div>
  );
}

/* ── People ───────────────────────────────────────────────────────────── */

export function Avatar({
  worker,
  size = "md",
  className,
}: {
  worker: Worker;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "sm" ? "size-6 text-[9px]" : size === "lg" ? "size-12 text-[14px]" : "size-9 text-[11px]";
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-mono font-semibold",
        worker.kind === "flex"
          ? "border border-dashed border-flux-400/60 bg-flux-500/10 text-flux-400"
          : worker.kind === "manager"
            ? "border border-ember-500/60 bg-ember-500/15 text-ember-400"
            : "border border-line-strong bg-elevated text-hi",
        dims,
        className,
      )}
    >
      {worker.kind === "manager" ? "YOU" : worker.initials}
    </span>
  );
}

export function SkillStars({ level, className }: { level: Skill; className?: string }) {
  if (level === 0) return <span className={cn("text-[10.5px] text-faint", className)}>Not trained</span>;
  return (
    <span aria-label={`${level} of 3`} className={cn("font-mono text-[11px] tracking-[0.05em]", className)}>
      <span className="text-ember-400">{"★".repeat(level)}</span>
      <span className="text-white/15">{"★".repeat(3 - level)}</span>
    </span>
  );
}

/** "P★★★ K★★ D★" — the whole card in one line. */
export function SkillLine({ worker, className }: { worker: Worker; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      {(["picking", "packing", "dispatch"] as Station[])
        .filter((station) => worker.skills[station] > 0)
        .map((station) => (
          <span key={station} className="inline-flex items-center gap-0.5">
            <span className="font-mono text-[9.5px] text-faint">{STATION_LETTER[station]}</span>
            <SkillStars level={worker.skills[station]} className="text-[10px]" />
          </span>
        ))}
    </span>
  );
}

/* ── Messages ─────────────────────────────────────────────────────────── */

/** A message from someone on the floor. Short, in their voice, never a question. */
export function StaffMessage({
  from,
  role,
  time,
  lines,
  tone = "neutral",
}: {
  from: string;
  role: string;
  time: string;
  lines: string[];
  tone?: "neutral" | "alert" | "ember";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      role="status"
      className={cn(
        "rounded-card border p-3.5",
        tone === "alert"
          ? "border-alert-500/40 bg-alert-500/[0.06]"
          : tone === "ember"
            ? "border-ember-500/35 bg-ember-500/[0.05]"
            : "border-line-strong bg-elevated",
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className={tone === "alert" ? "text-alert-500" : "text-ember-500"}>{from}</span>
        <span className="text-faint">{role}</span>
        <span className="ml-auto text-faint">{time}</span>
      </p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-[14px] leading-relaxed text-hi">
            {line}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/** The heading of the current moment, above the board. */
export function MomentHeading({
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
      <h2 className="mt-1.5 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[22px]">
        {title}
      </h2>
      {sub ? <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-mid">{sub}</p> : null}
    </div>
  );
}

/** "93% → 78%", with each side in its own tone. */
export function Shift({ from, to, className }: { from: number; to: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-mono font-semibold tabular-nums", className)}>
      <span className={TONE_TEXT[coverTone(from)]}>{Math.round(from * 100)}%</span>
      <span className="text-faint">→</span>
      <AnimatedPercent value={to} className={TONE_TEXT[coverTone(to)]} />
    </span>
  );
}
