"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScanLine } from "lucide-react";

import { formatQty } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Shared pieces for Case 02.
 *
 * The biscuit pack is a generic yellow-and-red pack drawn in CSS, not the
 * brand's artwork — it only has to make two things obvious: that the two
 * sizes look nearly identical, and which one is which when you read the label.
 * That near-identity is the whole mechanism of the case.
 */

export function BiscuitPack({
  size,
  counted = false,
  dim = false,
  large = false,
  hideLabel = false,
  className,
}: {
  size: "30" | "40";
  counted?: boolean;
  dim?: boolean;
  large?: boolean;
  /** For the replay, where the pack is in a hand and the label is not visible. */
  hideLabel?: boolean;
  className?: string;
}) {
  const forty = size === "40";
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 flex-col items-center overflow-hidden rounded-[3px] border transition-[opacity,filter,border-color] duration-200",
        large
          ? forty
            ? "h-[74px] w-[54px]"
            : "h-[64px] w-[46px]"
          : forty
            ? "h-9 w-[25px]"
            : "h-8 w-[21px]",
        counted ? "border-ion-400 ring-1 ring-ion-400/50" : "border-black/40",
        dim && "opacity-35 saturate-[0.3]",
        className,
      )}
      style={{ backgroundImage: "linear-gradient(180deg, #ffe066 0%, #f5c400 55%, #e0a800 100%)" }}
    >
      <span className="mt-[34%] h-[26%] w-full bg-[#c8352c]" />
      {hideLabel ? null : (
        <span
          className={cn(
            "absolute inset-x-0 bottom-[8%] text-center font-mono leading-none font-bold text-[#6d1a10]",
            large ? "text-[11px]" : "text-[6.5px]",
          )}
        >
          {forty ? "40g" : "30g"}
        </span>
      )}
    </span>
  );
}

/** +17 in amber, −17 in red, 0 in teal. Carried by the sign as well as colour. */
export function VarianceBadge({
  value,
  size = "md",
  pulse = false,
}: {
  value: number;
  size?: "md" | "lg";
  pulse?: boolean;
}) {
  const reduced = useReducedMotion();
  const tone =
    value > 0
      ? "border-warn-500/50 bg-warn-500/10 text-warn-500"
      : value < 0
        ? "border-alert-500/50 bg-alert-500/10 text-alert-500"
        : "border-ion-500/40 bg-ion-500/10 text-ion-400";
  return (
    <motion.span
      // Scale only, never opacity: a number that matters must be readable
      // even if the animation never runs.
      initial={pulse && !reduced ? { scale: 0.8 } : false}
      animate={{ scale: 1 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className={cn(
        "inline-flex items-center rounded-full border font-mono font-semibold tabular-nums",
        size === "lg" ? "px-3.5 py-1 text-[26px] leading-none" : "px-2 py-0.5 text-[12px]",
        tone,
      )}
    >
      {formatQty(value)}
    </motion.span>
  );
}

/**
 * A number that steps one unit at a time — seventeen deductions you can watch
 * happen, rather than a jump from 38 to 21. Interval-driven, so it keeps
 * counting in a background tab; instant under reduced motion.
 */
export function TickCounter({
  from,
  to,
  run,
  stepMs = 70,
  className,
  onDone,
}: {
  from: number;
  to: number;
  run: boolean;
  stepMs?: number;
  className?: string;
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(from);
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;

  React.useEffect(() => {
    if (!run) {
      setValue(from);
      return;
    }
    if (reduced || from === to) {
      setValue(to);
      doneRef.current?.();
      return;
    }
    let current = from;
    const direction = to > from ? 1 : -1;
    const timer = window.setInterval(() => {
      current += direction;
      setValue(current);
      if (current === to) {
        window.clearInterval(timer);
        doneRef.current?.();
      }
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [run, from, to, stepMs, reduced]);

  return (
    <span data-readout className={cn("tabular-nums", className)}>
      {value}
    </span>
  );
}

/** A handheld terminal's screen — the scan result, line by line. */
export function HhtPanel({
  lines,
}: {
  lines: { text: string; state?: "ok" | "warn" | "info" }[];
}) {
  return (
    <div className="rounded-lg border border-line-strong bg-void px-3 py-2.5 font-mono text-[10.5px] leading-relaxed">
      <p className="mb-1 flex items-center gap-1.5 text-[9px] tracking-[0.14em] text-faint uppercase">
        <ScanLine className="size-3 text-ion-400" aria-hidden />
        HHT-07
      </p>
      {lines.map((line) => (
        <p
          key={line.text}
          className={cn(
            line.state === "ok"
              ? "text-ion-400"
              : line.state === "warn"
                ? "text-warn-500"
                : "text-mid",
          )}
        >
          {line.state === "ok" ? "✓ " : line.state === "warn" ? "⚠ " : "› "}
          {line.text}
        </p>
      ))}
    </div>
  );
}

/** One short line of feedback, in the store's voice. Never praise. */
export function MicroLine({
  children,
  tone = "ion",
}: {
  children: React.ReactNode;
  tone?: "ion" | "warn" | "mid";
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-[12.5px] font-medium",
        tone === "ion" ? "text-ion-400" : tone === "warn" ? "text-warn-500" : "text-mid",
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </p>
  );
}

export function StageHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">{eyebrow}</p>
      <h1 className="mt-2 text-[21px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[25px]">
        {title}
      </h1>
      {sub ? (
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-mid">{sub}</p>
      ) : null}
    </div>
  );
}
