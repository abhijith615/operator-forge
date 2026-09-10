"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ScanLine } from "lucide-react";

import { MoneyCounter, Reveal } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import { CAGE_UNITS, EARBUDS } from "@/lib/challenge/day-two/earbuds";
import { EARBUDS_ROW, rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Stage 1 — the physical count.
 *
 * The learner has to establish the number themselves. That sounds like a
 * formality and it is the load-bearing moment of the whole day: every figure
 * downstream is arithmetic on top of this one, and a count you were handed
 * does not carry the same weight as a count you took.
 *
 * Nine boxes are shown because nine boxes are there. Twelve slots with three
 * gaps would answer the question before it was asked.
 */
export function CountCage({
  scanned,
  onScan,
  onScanAll,
  onConfirm,
  physicalCount,
  onContinue,
}: {
  scanned: string[];
  onScan: (id: string) => void;
  onScanAll: () => void;
  onConfirm: () => void;
  /** Non-null once confirmed — switches this surface to the reveal. */
  physicalCount: number | null;
  onContinue: () => void;
}) {
  const reduced = useReducedMotion();
  const done = scanned.length === CAGE_UNITS.length;

  if (physicalCount !== null) {
    return (
      <CountResult count={physicalCount} onContinue={onContinue} reduced={Boolean(reduced)} />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Secure cage · Bay H1
        </p>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[26px]">
          Count what is actually in the cage.
        </h1>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
          Scan every unit on the shelf. The system&apos;s number is not evidence of
          anything until there is a physical number to put beside it.
        </p>
      </div>

      {/* ── The shelf ── */}
      <div className="rounded-panel border border-line-strong bg-gradient-to-b from-elevated to-surface p-4 sm:p-6">
        <div className="flex items-center gap-2 pb-4">
          <ScanLine className="size-3.5 text-ember-500" aria-hidden />
          <span className="font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
            {EARBUDS.sku} · {EARBUDS.name}
          </span>
          <span
            data-readout
            className="ml-auto font-mono text-[20px] leading-none font-semibold text-hi tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {scanned.length}
            <span className="text-[13px] text-lo"> scanned</span>
          </span>
        </div>

        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5" role="list">
          {CAGE_UNITS.map((unit, index) => {
            const isScanned = scanned.includes(unit.id);
            return (
              <li key={unit.id}>
                <button
                  type="button"
                  onClick={() => onScan(unit.id)}
                  aria-pressed={isScanned}
                  aria-label={`Unit ${index + 1}, serial ${unit.serial}${isScanned ? ", scanned" : ""}`}
                  className={cn(
                    "relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-card border transition-colors duration-200",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian focus-visible:outline-none",
                    isScanned
                      ? "border-ion-500/60 bg-ion-500/[0.1]"
                      : "border-line-strong bg-void/60 hover:border-ember-500/50 hover:bg-white/[0.03]",
                  )}
                >
                  {/* The actual product. A cage full of the thing you are
                      counting reads as inventory; a row of grey rectangles
                      reads as a form. Unscanned units sit dimmed and
                      desaturated so the shelf visibly fills as you work. */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative size-11 overflow-hidden rounded-[6px] border transition-all duration-200",
                      isScanned
                        ? "border-ion-500/50"
                        : "border-line-bright opacity-45 saturate-[0.35]",
                    )}
                  >
                    <Image
                      src={EARBUDS_ROW.photo}
                      alt=""
                      width={88}
                      height={88}
                      className="size-full object-cover"
                    />
                  </span>

                  <span
                    className={cn(
                      "font-mono text-[9.5px] tracking-wide tabular-nums",
                      isScanned ? "text-ion-400" : "text-faint",
                    )}
                  >
                    {unit.serial}
                  </span>

                  {isScanned ? (
                    <motion.span
                      initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.22, ease: easing.outExpo }}
                      className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-ion-500 text-void"
                      aria-hidden
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:flex-1"
          disabled={!done}
          onClick={onConfirm}
        >
          {done
            ? "Confirm physical count"
            : `Scan every unit to confirm · ${scanned.length}/${CAGE_UNITS.length}`}
        </Button>
        {!done ? (
          <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onScanAll}>
            Scan all remaining
          </Button>
        ) : null}
      </div>

      <p className="text-[11.5px] leading-relaxed text-faint">
        The count can only be confirmed once every visible unit is scanned. A
        variance report built on a count nobody finished is not a finding.
      </p>
    </div>
  );
}

/* ── The first reveal ─────────────────────────────────────────────────── */

function CountResult({
  count,
  onContinue,
  reduced,
}: {
  count: number;
  onContinue: () => void;
  reduced: boolean;
}) {
  const variance = count - EARBUDS.systemStock;
  const exposure = Math.abs(variance) * EARBUDS.unitValue;

  const rows = [
    { label: "System stock", value: String(EARBUDS.systemStock), tone: "text-hi" },
    { label: "Physical count", value: String(count), tone: "text-hi" },
    { label: "Variance", value: String(variance), tone: "text-alert-500" },
    { label: "Unit value", value: rupees(EARBUDS.unitValue), tone: "text-hi" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Count confirmed
        </p>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[26px]">
          The shelf and the system disagree.
        </h1>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {rows.map((row, index) => (
          <motion.div
            key={row.label}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : index * 0.08, ease: easing.outExpo }}
            className="bg-surface px-4 py-3.5"
          >
            <dt className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
              {row.label}
            </dt>
            <dd
              data-readout
              className={cn(
                "mt-1.5 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
                row.tone,
              )}
            >
              {row.value}
            </dd>
          </motion.div>
        ))}
      </dl>

      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduced ? 0 : 0.42 }}
      >
        <Reveal
          eyebrow="Unexplained"
          headline={<MoneyCounter value={exposure} duration={1.1} />}
          body="Three units are not on the shelf. Nothing so far says where they went — only that the record and the cage do not agree."
        />
      </motion.div>

      <Button variant="primary" size="lg" className="w-full" onClick={onContinue}>
        Account for the missing 3
      </Button>
    </div>
  );
}
