"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";

import {
  BiscuitPack,
  StageHeading,
  TickCounter,
} from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import { formatQty, rupees } from "@/lib/challenge/day-two/ledger";
import {
  AFFECTED_PICKS,
  NET_VALUE_IMPACT,
  RECORD_UNITS_AFFECTED,
  SKU_30,
  SKU_40,
  varianceOf,
  type SkuSpec,
} from "@/lib/challenge/day-two/parleg/content";
import { pgPreventiveControls } from "@/lib/challenge/day-two/parleg/engine";
import { parlegInsight } from "@/lib/challenge/day-two/parleg/scoring";
import type { ParleGState } from "@/lib/challenge/day-two/parleg/types";
import { cn } from "@/lib/utils";

/**
 * The reconciliation entry, and the moment the numbers are fixed.
 *
 * The panel states what the learner established, not what the case knows: a
 * learner who corrected the stock without tracing it sees "not established"
 * against the root cause, and their ₹85 is reported as corrected rather than
 * classified. The record units are shown beside the money and never added to
 * it — they are a count of wrong records, not rupees.
 */
export function ReconciliationPanel({
  state,
  onReconcile,
  onReturn,
}: {
  state: ParleGState;
  onReconcile: () => void;
  onReturn: () => void;
}) {
  const [settled, setSettled] = React.useState(0);
  const restored = state.reconciled && settled >= 2;
  const rootKnown = state.flowSolved;
  const controls = pgPreventiveControls(state);

  const rows: { label: string; value: string; tone?: string }[] = [
    { label: "Affected transactions", value: String(AFFECTED_PICKS) },
    {
      label: "Root cause",
      value: rootKnown ? "Wrong-size picking" : "Not established",
      tone: rootKnown ? "text-hi" : "text-warn-500",
    },
    {
      label: "Control gap",
      value: rootKnown ? "Incomplete product barcode verification" : "Not established",
      tone: rootKnown ? "text-hi" : "text-warn-500",
    },
    { label: "Net value impact", value: rupees(NET_VALUE_IMPACT) },
    { label: "Inventory records corrected", value: `${RECORD_UNITS_AFFECTED} units` },
  ];

  return (
    <div className="space-y-5">
      <StageHeading eyebrow="SKU drift reconciliation" title="Parle-G 30 g / 40 g" />

      <div className="grid gap-3 sm:grid-cols-2">
        {[SKU_30, SKU_40].map((spec) => (
          <SkuRecon
            key={spec.id}
            spec={spec}
            run={state.reconciled}
            onDone={() => setSettled((n) => n + 1)}
          />
        ))}
      </div>

      <dl className="overflow-hidden rounded-card border border-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-surface px-4 py-2.5",
              index > 0 && "border-t border-line",
            )}
          >
            <dt className="w-52 shrink-0 text-[12.5px] text-lo">{row.label}</dt>
            <dd className={cn("text-[13px] font-medium", row.tone ?? "text-hi")}>{row.value}</dd>
          </div>
        ))}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line bg-surface px-4 py-2.5">
          <dt className="w-52 shrink-0 text-[12.5px] text-lo">Preventive controls selected</dt>
          <dd className="min-w-0 flex-1 text-[13px] font-medium text-hi">
            {controls.length > 0 ? (
              <ul className="space-y-0.5">
                {controls.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : (
              <span className="text-warn-500">None selected</span>
            )}
          </dd>
        </div>
      </dl>

      {!state.reconciled ? (
        <Button variant="primary" size="lg" className="w-full" onClick={onReconcile}>
          Reconcile SKUs
        </Button>
      ) : null}

      {restored ? (
        <div className="space-y-4">
          <div className="rounded-card border border-ion-500/45 bg-ion-500/[0.06] p-5">
            <p className="font-mono text-[11px] tracking-[0.2em] text-ion-400 uppercase">
              Inventory match restored
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <p className="text-[15px] font-semibold text-hi">
                {RECORD_UNITS_AFFECTED} record units corrected
              </p>
              <p className={cn("text-[15px] font-semibold", rootKnown ? "text-hi" : "text-warn-500")}>
                {rupees(NET_VALUE_IMPACT)}{" "}
                {rootKnown ? "variance classified" : "corrected · cause not established"}
              </p>
            </div>
          </div>

          <section className="rounded-card border border-ember-500/30 bg-ember-500/[0.05] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
              Case insight
            </p>
            <ul className="mt-3 space-y-2">
              {parlegInsight(state).map((line) => (
                <li key={line} className="text-[13.5px] leading-relaxed text-mid">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <Button variant="primary" size="lg" className="w-full" onClick={onReturn}>
            Return to the Day 2 ledger
            <ArrowRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SkuRecon({
  spec,
  run,
  onDone,
}: {
  spec: SkuSpec;
  run: boolean;
  onDone: () => void;
}) {
  const [done, setDone] = React.useState(false);
  const variance = varianceOf(spec);

  return (
    <section
      className={cn(
        "rounded-card border p-4 transition-colors duration-500",
        done
          ? "border-ion-500/50 bg-ion-500/[0.05]"
          : variance > 0
            ? "border-warn-500/45 bg-surface"
            : "border-alert-500/45 bg-surface",
      )}
    >
      <header className="flex items-center gap-3">
        <BiscuitPack size={spec.id === "sku30" ? "30" : "40"} />
        <div>
          <p className="text-[14px] font-semibold text-hi">{spec.name}</p>
          <p className="font-mono text-[10.5px] text-faint">{spec.bin}</p>
        </div>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">System before</dt>
          <dd data-readout className="font-mono text-[16px] font-semibold text-hi tabular-nums">
            {spec.system}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Physical</dt>
          <dd data-readout className="font-mono text-[16px] font-semibold text-hi tabular-nums">
            {spec.physical}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Correction</dt>
          <dd
            data-readout
            className={cn(
              "font-mono text-[16px] font-semibold tabular-nums",
              variance > 0 ? "text-warn-500" : "text-alert-500",
            )}
          >
            {formatQty(variance)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">New system stock</dt>
          <dd className="flex items-center gap-1.5 font-mono text-[20px] font-semibold text-hi">
            <TickCounter
              from={spec.system}
              to={spec.physical}
              run={run}
              onDone={() => {
                setDone(true);
                onDone();
              }}
            />
            {done ? <Check className="size-4 text-ion-400" aria-label="matches the shelf" /> : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}
