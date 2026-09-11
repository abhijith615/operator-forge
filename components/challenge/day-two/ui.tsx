"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

import { URGENT_SECONDS, countdown } from "@/lib/challenge/clock";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ── Clock ────────────────────────────────────────────────────────────── */

/** The fifteen-minute countdown, styled exactly as Day 1's. */
export function CountdownPill({
  remaining,
  label = "remaining in the audit",
}: {
  remaining: number;
  /** What the time is left of, for screen readers. */
  label?: string;
}) {
  const urgent = remaining <= URGENT_SECONDS;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        urgent ? "border-alert-500/50 bg-alert-500/10" : "border-line-strong",
      )}
      role="timer"
      aria-live="off"
    >
      <span
        className={cn("size-1.5 rounded-full", urgent ? "bg-alert-500" : "bg-ion-500")}
        aria-hidden
      />
      <span
        data-readout
        className={cn(
          "font-mono text-[14px] leading-none font-semibold tabular-nums",
          urgent ? "text-alert-500" : "text-hi",
        )}
      >
        {countdown(remaining)}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ── Money ────────────────────────────────────────────────────────────── */

/**
 * A rupee figure that animates when it changes.
 *
 * The existing CountUp animates once on entering view, which is the wrong
 * trigger here: the whole point of the unexplained figure is that it moves
 * *while you watch it*, falling as each unit is accounted for, because of something
 * you just found. So this keys off the value itself and re-runs on every
 * change, and it groups digits the way the store's own paperwork does.
 */
export function MoneyCounter({
  value,
  className,
  duration = 0.9,
}: {
  value: number;
  className?: string;
  duration?: number;
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
      duration,
      ease: easing.outExpo,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span data-readout className={cn("tabular-nums", className)}>
      {rupees(display)}
    </span>
  );
}

/* ── Stat tile ────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  tone = "neutral",
  icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "alert" | "ion" | "warn";
  icon?: React.ReactNode;
  hint?: string;
}) {
  const ring =
    tone === "alert"
      ? "border-alert-500/40"
      : tone === "ion"
        ? "border-ion-500/35"
        : tone === "warn"
          ? "border-warn-500/40"
          : "border-line";
  const text =
    tone === "alert"
      ? "text-alert-500"
      : tone === "ion"
        ? "text-ion-400"
        : tone === "warn"
          ? "text-warn-500"
          : "text-hi";

  return (
    <div className={cn("rounded-card border bg-surface p-3.5", ring)}>
      <div className="flex items-start gap-2">
        <p className="text-[10px] leading-tight font-medium tracking-[0.1em] text-lo uppercase">
          {label}
        </p>
        {icon ? <span className="ml-auto shrink-0 text-lo">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
          text,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-faint">{hint}</p> : null}
    </div>
  );
}

/* ── Disposition split ────────────────────────────────────────────────── */

/**
 * Explained / Recovered / Unresolved, always shown together and never summed.
 *
 * Keeping the three side by side is the single most important piece of
 * information design on Day 2. A learner who leaves believing that "explained"
 * money came back has learned the opposite of the lesson, so the three tiles
 * carry their own one-line definitions rather than relying on colour.
 */
export function DispositionSplit({
  explained,
  recovered,
  unresolved,
  size = "md",
}: {
  explained: number;
  recovered: number;
  unresolved: number;
  size?: "sm" | "md";
}) {
  const cells = [
    {
      key: "explained",
      label: "Explained",
      value: explained,
      note: "Stock genuinely left. The record did not follow it.",
      ring: "border-info-500/35",
      text: "text-info-500",
    },
    {
      key: "recovered",
      label: "Recovered",
      value: recovered,
      note: "Stock was in the building. It is back in the count.",
      ring: "border-ion-500/35",
      text: "text-ion-400",
    },
    {
      key: "unresolved",
      label: "Still unexplained",
      value: unresolved,
      note: "Not accounted for. Stays open.",
      ring: "border-alert-500/40",
      text: "text-alert-500",
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {cells.map((cell) => (
        <div key={cell.key} className={cn("rounded-card border bg-surface p-3.5", cell.ring)}>
          <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            {cell.label}
          </p>
          <p
            className={cn(
              "mt-2 leading-none font-semibold tracking-[-0.03em]",
              cell.text,
              size === "sm" ? "text-[19px]" : "text-[23px]",
            )}
          >
            <MoneyCounter value={cell.value} />
          </p>
          <p className="mt-2 text-[11px] leading-snug text-faint">{cell.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Reveal ───────────────────────────────────────────────────────────── */

/** A finding landing on screen. Deliberate, and never celebratory. */
export function Reveal({
  eyebrow,
  headline,
  body,
  tone = "alert",
  children,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  body?: string;
  tone?: "alert" | "ion" | "info";
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const ring =
    tone === "ion"
      ? "border-ion-500/40 bg-ion-500/[0.06]"
      : tone === "info"
        ? "border-info-500/40 bg-info-500/[0.06]"
        : "border-alert-500/45 bg-alert-500/[0.06]";
  const text =
    tone === "ion" ? "text-ion-400" : tone === "info" ? "text-info-500" : "text-alert-500";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      role="status"
      aria-live="polite"
      className={cn("rounded-card border p-5", ring)}
    >
      <p className={cn("font-mono text-[10px] tracking-[0.2em] uppercase", text)}>{eyebrow}</p>
      <p
        className={cn(
          "mt-2.5 text-[28px] leading-none font-semibold tracking-[-0.04em] tabular-nums sm:text-[32px]",
          text,
        )}
      >
        {headline}
      </p>
      {body ? <p className="mt-3 text-[13px] leading-relaxed text-mid">{body}</p> : null}
      {children}
    </motion.div>
  );
}

/* ── Record chrome ────────────────────────────────────────────────────── */

/** The frame every evidence view sits in: one source, one anomaly, one action. */
export function RecordPanel({
  title,
  meta,
  children,
  footer,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">{title}</h2>
        {meta ? <p className="text-[11.5px] text-faint">{meta}</p> : null}
      </header>
      <div className="p-4">{children}</div>
      {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </motion.section>
  );
}

/** A row in a log. `flag` marks the absence the learner is meant to notice. */
export function LogRow({
  time,
  title,
  detail,
  right,
  flag = false,
  onClick,
}: {
  time: string;
  title: string;
  detail?: string;
  right?: React.ReactNode;
  flag?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-baseline gap-3">
        <span
          data-readout
          className="font-mono text-[11.5px] text-faint tabular-nums"
        >
          {time}
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug font-medium text-hi">
          {title}
        </span>
        {right}
      </span>
      {detail ? (
        <span className="mt-1 block pl-[calc(2.6rem)] text-[12px] leading-relaxed text-mid">
          {detail}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "block w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
    flag ? "border-warn-500/40 bg-warn-500/[0.05]" : "border-transparent",
    onClick &&
      "hover:border-ember-500/40 hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
