"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert, Minus, TriangleAlert } from "lucide-react";

import {
  JOURNEY,
  JOURNEY_LABEL,
  PROMISE_LABEL,
  PROMISE_DIMENSIONS,
  type JourneyNode,
  type NodeState,
  type PromiseDimension,
  type PromiseScore,
} from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Day 5's shared surface.
 *
 * Warmer and quieter than Days 1–4: the store's charcoal stays, but the
 * customer's side of the glass is off-white, the protected state is teal
 * rather than the operator's amber, and red is kept for actual customer harm.
 * Nothing here is a KPI card — the numbers are small and the customer outcome
 * is large, which is the inversion the day is about.
 */

/* ── State language ───────────────────────────────────────────────────── */

export const NODE_TEXT: Record<NodeState, string> = {
  pending: "text-faint",
  clear: "text-ion-400",
  risk: "text-warn-500",
  broken: "text-alert-500",
};

export const NODE_RING: Record<NodeState, string> = {
  pending: "border-line-strong",
  clear: "border-ion-500/50",
  risk: "border-warn-500/50",
  broken: "border-alert-500/50",
};

export const NODE_FILL: Record<NodeState, string> = {
  pending: "bg-white/[0.06]",
  clear: "bg-ion-500",
  risk: "bg-warn-500",
  broken: "bg-alert-500",
};

/** Never colour alone: each state carries its own mark. */
export function NodeMark({ state, className }: { state: NodeState; className?: string }) {
  const Icon = state === "clear" ? Check : state === "risk" ? CircleAlert : state === "broken" ? TriangleAlert : Minus;
  return <Icon className={cn("size-3", NODE_TEXT[state], className)} aria-hidden />;
}

/* ── The customer promise journey ─────────────────────────────────────── */

/**
 * Six nodes, and the sixth is the point. Everything before `use` is the
 * store's view of the order; `use` is the customer's, and it is the only one
 * that lights up when the real problem has been solved.
 */
export function CustomerJourney({
  states,
  label,
  compact = false,
  className,
}: {
  states: Partial<Record<JourneyNode, NodeState>>;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <p className="mb-1.5 truncate font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{label}</p>
      ) : null}
      <ol className="flex items-center gap-0" aria-label={label ? `${label} journey` : "Customer journey"}>
        {JOURNEY.map((node, index) => {
          const state = states[node] ?? "pending";
          const last = index === JOURNEY.length - 1;
          return (
            <li key={node} className={cn("flex min-w-0 items-center", last ? "shrink-0" : "flex-1")}>
              <span className="flex min-w-0 flex-col items-center gap-1">
                <motion.span
                  initial={false}
                  animate={
                    reduced
                      ? {}
                      : state === "clear" && last
                        ? { scale: [1, 1.35, 1] }
                        : { scale: 1 }
                  }
                  transition={{ duration: 0.5, ease: easing.outExpo }}
                  className={cn(
                    "grid place-items-center rounded-full border",
                    compact ? "size-4" : "size-5",
                    NODE_RING[state],
                    state === "pending" ? "bg-transparent" : "bg-transparent",
                    last && state === "clear" ? "ring-2 ring-ion-500/25" : "",
                  )}
                >
                  <span className={cn("block rounded-full", compact ? "size-1.5" : "size-2", NODE_FILL[state])} />
                </motion.span>
                {!compact ? (
                  <span
                    className={cn(
                      "truncate text-center font-mono text-[8.5px] tracking-[0.1em] uppercase",
                      last && state === "clear" ? "text-ion-400" : "text-faint",
                    )}
                  >
                    {JOURNEY_LABEL[node]}
                  </span>
                ) : null}
              </span>
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-px flex-1",
                    state === "clear" ? "bg-ion-500/35" : state === "broken" ? "bg-alert-500/30" : "bg-line-strong",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Promise status ───────────────────────────────────────────────────── */

/**
 * Five readings, never one. A single satisfaction number invites optimising
 * the number; five force a judgement about which one this situation is about.
 */
export function PromiseStatus({
  promise,
  className,
}: {
  promise: PromiseScore;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-5 gap-2", className)}>
      {PROMISE_DIMENSIONS.map((dimension: PromiseDimension) => {
        const value = promise[dimension];
        const tone = value >= 85 ? "text-ion-400" : value >= 60 ? "text-warn-500" : "text-alert-500";
        return (
          <div key={dimension} className="min-w-0">
            <dt className="truncate font-mono text-[8.5px] tracking-[0.1em] text-faint uppercase">
              {PROMISE_LABEL[dimension]}
            </dt>
            <dd className="mt-1">
              <span data-readout className={cn("font-mono text-[14px] leading-none font-semibold tabular-nums", tone)}>
                {value}
              </span>
              <span className="mt-1 block h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    value >= 85 ? "bg-ion-500" : value >= 60 ? "bg-warn-500" : "bg-alert-500",
                  )}
                  style={{ width: `${Math.max(3, Math.min(100, value))}%` }}
                />
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ── The customer's own card ──────────────────────────────────────────── */

/**
 * Warm off-white, against the store's charcoal. Used wherever the customer is
 * speaking or the customer's outcome is being shown, so the two points of view
 * never look like the same surface.
 */
export function CustomerCard({
  eyebrow,
  children,
  tone = "warm",
  className,
}: {
  eyebrow?: string;
  children: React.ReactNode;
  tone?: "warm" | "clear" | "risk" | "broken";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-4 backdrop-blur-sm",
        tone === "warm"
          ? "border-[#f4efe6]/15 bg-[#f4efe6]/[0.05]"
          : tone === "clear"
            ? "border-ion-500/35 bg-ion-500/[0.05]"
            : tone === "risk"
              ? "border-warn-500/35 bg-warn-500/[0.05]"
              : "border-alert-500/35 bg-alert-500/[0.05]",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "font-mono text-[9.5px] tracking-[0.18em] uppercase",
            tone === "clear" ? "text-ion-400" : tone === "risk" ? "text-warn-500" : tone === "broken" ? "text-alert-500" : "text-[#e8ddc9]/70",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className={eyebrow ? "mt-2" : undefined}>{children}</div>
    </div>
  );
}

/** What the store's system says, in the store's own flat voice. */
export function SystemChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1">
      <span className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">{label}</span>
      <span
        className={cn(
          "font-mono text-[11px] font-semibold",
          tone === "ok" ? "text-ion-400" : tone === "warn" ? "text-warn-500" : "text-hi",
        )}
      >
        {value}
      </span>
    </span>
  );
}

/* ── Case framing ─────────────────────────────────────────────────────── */

export function CaseHeading({
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
      <h2 className="mt-2 text-[clamp(1.35rem,4.2vw,1.75rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-hi">
        {title}
      </h2>
      {sub ? <p className="mt-2 max-w-prose text-[13.5px] leading-relaxed text-mid">{sub}</p> : null}
    </div>
  );
}

/**
 * The quiet outcome line after a case. Never a score, never a "correct!" —
 * just what the customer now has, in the customer's terms.
 */
export function OutcomeChip({
  state,
  headline,
  detail,
}: {
  state: NodeState;
  headline: string;
  detail?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-card border px-3.5 py-3",
        state === "clear"
          ? "border-ion-500/40 bg-ion-500/[0.06]"
          : state === "risk"
            ? "border-warn-500/40 bg-warn-500/[0.05]"
            : "border-alert-500/40 bg-alert-500/[0.05]",
      )}
    >
      <NodeMark state={state} className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0">
        <p className={cn("font-mono text-[10.5px] tracking-[0.16em] uppercase", NODE_TEXT[state])}>{headline}</p>
        {detail ? <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{detail}</p> : null}
      </div>
    </motion.div>
  );
}

/** A short line from someone — the customer, the floor, support. */
export function Voice({
  from,
  role,
  time,
  lines,
  tone = "store",
}: {
  from: string;
  role?: string;
  time: string;
  lines: string[];
  tone?: "store" | "customer" | "alert";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easing.outExpo }}
      className={cn(
        "rounded-card border p-3.5",
        tone === "customer"
          ? "border-[#f4efe6]/15 bg-[#f4efe6]/[0.05]"
          : tone === "alert"
            ? "border-alert-500/40 bg-alert-500/[0.05]"
            : "border-line-strong bg-elevated",
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className={tone === "alert" ? "text-alert-500" : tone === "customer" ? "text-[#e8ddc9]/80" : "text-ember-500"}>
          {from}
        </span>
        {role ? <span className="text-faint">{role}</span> : null}
        <span className="ml-auto text-faint">{time}</span>
      </p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-[14.5px] leading-relaxed text-hi">
            {line}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/** Progressive disclosure: a panel that only says anything once opened. */
export function InspectButton({
  label,
  detail,
  open,
  onOpen,
  className,
}: {
  label: string;
  detail?: string;
  open: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={onOpen}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-card border px-3 py-2 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        open ? "border-ion-500/45 bg-ion-500/[0.05]" : "border-line bg-elevated hover:border-line-bright",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          open ? "border-ion-500 bg-ion-500 text-void" : "border-line-strong",
        )}
        aria-hidden
      >
        {open ? <Check className="size-2.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-hi">{label}</span>
        {detail ? <span className="block text-[11px] text-lo">{detail}</span> : null}
      </span>
    </button>
  );
}
