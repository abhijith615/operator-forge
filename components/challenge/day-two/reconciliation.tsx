"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PenLine } from "lucide-react";

import { DispositionSplit } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import { EARBUDS } from "@/lib/challenge/day-two/earbuds";
import { rupees } from "@/lib/challenge/day-two/ledger";
import type { CaseLedger } from "@/lib/challenge/day-two/types";
import { easing } from "@/lib/motion";

/**
 * Stage 10 — the audit entry.
 *
 * This is written as a manager's reconciliation, not as a results screen, and
 * the button says sign rather than submit. That distinction is doing real
 * work: an audit entry is a thing you put your name to and that somebody reads
 * next week, and the unresolved line staying on it is the point.
 */
export function Reconciliation({
  ledger,
  onSign,
}: {
  ledger: CaseLedger;
  onSign: () => void;
}) {
  const reduced = useReducedMotion();

  const rows: { label: string; value: string; muted?: boolean }[] = [
    { label: "System stock", value: String(EARBUDS.systemStock) },
    { label: "Initial physical count", value: String(EARBUDS.actualPhysical) },
    { label: "Original variance", value: `${ledger.varianceUnits} units` },
    { label: "Original exposure", value: rupees(ledger.exposure) },
  ];

  const outcome = [
    {
      label: "Explained process variance",
      units: ledger.explainedUnits,
      value: ledger.explainedValue,
      note: "High-value item physically issued without the corresponding item scan.",
    },
    {
      label: "Physical stock recovered",
      units: ledger.recoveredUnits,
      value: ledger.recoveredValue,
      note: "Cancelled-order stock retained in the exception bay and never restowed.",
    },
    {
      label: "Unresolved",
      units: ledger.unresolvedUnits,
      value: ledger.unresolvedValue,
      note: "Not accounted for by any record examined tonight.",
    },
  ];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      className="space-y-5"
    >
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          High-value variance reconciliation
        </p>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[26px]">
          {EARBUDS.name}
        </h1>
        <p className="mt-1 font-mono text-[11.5px] text-faint">
          {EARBUDS.sku} · {EARBUDS.location}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="bg-surface px-4 py-3.5">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
              {row.label}
            </dt>
            <dd
              data-readout
              className="mt-1.5 text-[19px] leading-none font-semibold text-hi tabular-nums"
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="overflow-hidden rounded-card border border-line">
        {outcome.map((entry, index) => (
          <div
            key={entry.label}
            className={`bg-surface px-4 py-3.5 ${index > 0 ? "border-t border-line" : ""}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[13px] font-medium text-hi">{entry.label}</p>
              <p
                data-readout
                className="ml-auto font-mono text-[13px] font-semibold text-hi tabular-nums"
              >
                {entry.units} {entry.units === 1 ? "unit" : "units"} ·{" "}
                {rupees(entry.value)}
              </p>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mid">{entry.note}</p>
          </div>
        ))}
      </section>

      <DispositionSplit
        explained={ledger.explainedValue}
        recovered={ledger.recoveredValue}
        unresolved={ledger.unresolvedValue}
        size="sm"
      />

      <section className="rounded-card border border-line bg-elevated p-4">
        <h2 className="font-mono text-[10px] tracking-[0.16em] text-lo uppercase">
          Entry notes
        </h2>
        <dl className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-44 shrink-0 text-lo">Known control issue</dt>
            <dd className="text-mid">Unscanned high-value item movement.</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-44 shrink-0 text-lo">Secondary issue</dt>
            <dd className="text-mid">Cancelled-order restow failure.</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-44 shrink-0 text-lo">Remaining investigation</dt>
            <dd className="text-mid">
              {ledger.unresolvedUnits > 0 ? "Open." : "None outstanding."}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-44 shrink-0 text-lo">Escalation</dt>
            <dd className="text-mid">Loss Prevention / Cluster Operations follow-up.</dd>
          </div>
        </dl>
      </section>

      <Button variant="primary" size="lg" className="w-full" onClick={onSign}>
        <PenLine className="size-4" aria-hidden />
        Sign audit entry
      </Button>
    </motion.div>
  );
}
