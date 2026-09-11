"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import {
  BiscuitPack,
  MicroLine,
  StageHeading,
  VarianceBadge,
} from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import { EARBUDS_ROW, formatQty } from "@/lib/challenge/day-two/ledger";
import {
  AFFECTED_PICKS,
  MIRROR_PAIR,
  SKU_30,
  SKU_40,
  varianceOf,
  type VarianceChip,
} from "@/lib/challenge/day-two/parleg/content";
import type { ParleGState } from "@/lib/challenge/day-two/parleg/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The first moment of the case: seeing that two variances are one.
 *
 * Tonight's other audit lines sit in the strip too, because a pattern is only
 * a pattern against noise. The learner links two chips; the interface never
 * says which. When the right two are linked, the cards come together and the
 * screen says only what is true — that the numbers mirror — and nothing about
 * why.
 */
export function SkuComparison({
  state,
  onLink,
  onTrace,
  onCorrectNow,
}: {
  state: ParleGState;
  onLink: (a: string, b: string) => void;
  onTrace: () => void;
  onCorrectNow: () => void;
}) {
  const reduced = useReducedMotion();
  const [first, setFirst] = React.useState<string | null>(null);
  const [misses, setMisses] = React.useState(0);

  const chips: VarianceChip[] = [
    { id: "earbuds", label: "Wireless Earbuds", value: EARBUDS_ROW.qtyVariance },
    { id: "sku30", label: SKU_30.name, value: varianceOf(SKU_30) },
    { id: "faceWash", label: "Face Wash 100ml", value: 0 },
    { id: "sku40", label: SKU_40.name, value: varianceOf(SKU_40) },
    { id: "milk", label: "Fresh Milk 1L", value: 0 },
  ];

  function tap(id: string) {
    if (state.linked) return;
    if (first === null) {
      setFirst(id);
      return;
    }
    if (first === id) {
      setFirst(null);
      return;
    }
    const pair = new Set([first, id]);
    const mirrored = MIRROR_PAIR.every((sku) => pair.has(sku));
    onLink(first, id);
    if (!mirrored) setMisses((n) => n + 1);
    setFirst(null);
  }

  return (
    <div className="space-y-5">
      <StageHeading
        eyebrow="Stage 1 · Spot the pattern"
        title={state.linked ? "Two variances. One story." : "Tonight's variances."}
        sub={
          state.linked
            ? undefined
            : "Tap the two variances that explain each other."
        }
      />

      {!state.linked ? (
        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {chips.map((chip) => {
              const selected = first === chip.id;
              return (
                <li key={chip.id}>
                  <motion.button
                    key={`${chip.id}-${misses}`}
                    type="button"
                    onClick={() => tap(chip.id)}
                    aria-pressed={selected}
                    // A small shake on a pairing that does not hold — no word
                    // for "wrong", just the pair refusing to link.
                    animate={misses > 0 && !reduced ? { x: [0, -3, 3, -2, 0] } : undefined}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex w-full flex-col items-start gap-2 rounded-card border px-3 py-3 text-left transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      selected
                        ? "border-ember-500/70 bg-ember-500/[0.09]"
                        : "border-line bg-surface hover:border-line-bright",
                    )}
                  >
                    <span className="text-[11.5px] leading-tight text-mid">{chip.label}</span>
                    <VarianceBadge value={chip.value} />
                  </motion.button>
                </li>
              );
            })}
          </ul>
          {misses > 0 ? <MicroLine tone="mid">Those two don&apos;t move together.</MicroLine> : null}
        </div>
      ) : (
        <MirrorReveal reduced={Boolean(reduced)} />
      )}

      <div className="flex flex-col gap-2.5">
        {state.linked ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onTrace}>
            Trace the movement
            <ArrowRight />
          </Button>
        ) : null}
        {/* Always offered, because it is always tempting. */}
        <button
          type="button"
          onClick={onCorrectNow}
          className="self-center rounded px-2 py-1 text-[12px] text-lo underline-offset-4 transition-colors hover:text-mid hover:underline focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          Skip the investigation — adjust both records to match the count
        </button>
      </div>
    </div>
  );
}

function MirrorReveal({ reduced }: { reduced: boolean }) {
  return (
    <div className="space-y-4">
      {/* Clipped on x: the cards slide in from the sides, and on a phone
          that entrance would otherwise widen the page for a moment. */}
      <div className="flex flex-col items-center gap-2 overflow-x-clip sm:flex-row sm:gap-0">
        <MirrorCard size="30" name={SKU_30.name} value={varianceOf(SKU_30)} reduced={reduced} from="left" />

        {/* The link itself. Horizontal on desktop, vertical on a phone. */}
        <svg
          viewBox="0 0 120 24"
          className="h-6 w-24 shrink-0 rotate-90 text-ember-500 sm:h-8 sm:w-32 sm:rotate-0"
          aria-hidden
        >
          <motion.path
            d="M6 12 H114"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: easing.outExpo }}
          />
          <circle cx="6" cy="12" r="4" fill="currentColor" />
          <circle cx="114" cy="12" r="4" fill="currentColor" />
        </svg>

        <MirrorCard size="40" name={SKU_40.name} value={varianceOf(SKU_40)} reduced={reduced} from="right" />
      </div>

      <div className="rounded-card border border-ember-500/30 bg-ember-500/[0.05] p-4 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] text-ember-400 uppercase">
          The numbers mirror each other
        </p>
        <p className="mt-2 text-[15px] font-medium text-hi">
          {AFFECTED_PICKS} extra here. {AFFECTED_PICKS} missing there.
        </p>
      </div>

      <MicroLine>Same number. Opposite direction.</MicroLine>
    </div>
  );
}

function MirrorCard({
  size,
  name,
  value,
  reduced,
  from,
}: {
  size: "30" | "40";
  name: string;
  value: number;
  reduced: boolean;
  from: "left" | "right";
}) {
  return (
    <motion.div
      initial={reduced ? false : { x: from === "left" ? -24 : 24 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.45, ease: easing.outExpo }}
      className={cn(
        "flex w-full items-center gap-4 rounded-card border bg-surface p-4 sm:flex-1",
        value > 0 ? "border-warn-500/50" : "border-alert-500/50",
      )}
    >
      <BiscuitPack size={size} large />
      <div>
        <p className="text-[13px] text-mid">{name}</p>
        <p className="mt-1.5">
          <VarianceBadge value={value} size="lg" />
        </p>
        <p className="mt-1.5 font-mono text-[10.5px] text-faint">
          physical vs system · {formatQty(value)}
        </p>
      </div>
    </motion.div>
  );
}
