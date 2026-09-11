"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crosshair, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { zoneFacts } from "@/lib/challenge/day-four/inspect";
import type { Day4State, ZoneId } from "@/lib/challenge/day-four/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * One zone, looked at. A panel beside the map on a desktop, a sheet over the
 * bottom of it on a phone. It shows the zone's facts and nothing else — the
 * operator decides what they add up to.
 */
export function ZoneInspector({
  state,
  zone,
  compact,
  onClose,
}: {
  state: Day4State;
  zone: ZoneId;
  compact: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const info = zoneFacts(state, zone);

  const body = (
    <div>
      <div className="flex items-start gap-2">
        <p className="font-mono text-[10px] tracking-[0.18em] text-ember-500 uppercase">Inspecting</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto rounded-full p-1 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <h3 className="text-[18px] font-semibold text-hi">{info.title}</h3>
      <dl className="mt-3 space-y-2">
        {info.facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
            <dt className="text-[12px] text-lo">{fact.label}</dt>
            <dd
              className={cn(
                "text-right font-mono text-[13px] font-semibold",
                fact.tone === "alert" ? "text-alert-500" : fact.tone === "warn" ? "text-warn-500" : fact.tone === "ion" ? "text-ion-400" : "text-hi",
              )}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-relaxed text-mid">{info.note}</p>
    </div>
  );

  if (!compact) {
    return (
      <motion.section
        key={zone}
        initial={reduced ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: easing.outExpo }}
        aria-label={`${info.title} details`}
        className="rounded-card border border-line-strong bg-elevated p-4"
      >
        {body}
      </motion.section>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40" role="dialog" aria-label={`${info.title} details`}>
      <motion.div
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: easing.outExpo }}
        className="max-h-[60dvh] overflow-y-auto rounded-t-panel border-t border-line bg-obsidian p-4 shadow-2xl"
      >
        {body}
      </motion.div>
    </div>
  );
}

/** The call to action under the map once enough has been seen. */
export function MarkPrompt({
  inspected,
  needed,
  marking,
  onStart,
}: {
  inspected: number;
  needed: number;
  marking: boolean;
  onStart: () => void;
}) {
  if (marking) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-alert-500/50 bg-alert-500/[0.06] px-3.5 py-3" role="status">
        <Crosshair className="size-4 text-alert-500" aria-hidden />
        <p className="text-[13.5px] font-semibold text-hi">Mark the bottleneck — tap the zone on the map.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={inspected >= needed ? "primary" : "secondary"} size="lg" disabled={inspected < needed} onClick={onStart}>
        <Crosshair className="size-4" aria-hidden />
        Mark the bottleneck
      </Button>
      <span className="text-[12px] text-lo">
        {inspected < needed
          ? `Inspect at least ${needed} zones first · ${inspected} seen`
          : `${inspected} zones inspected. Look at more, or mark it.`}
      </span>
    </div>
  );
}
