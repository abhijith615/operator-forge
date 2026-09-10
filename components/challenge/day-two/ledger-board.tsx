"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Boxes, FileText, Lock, Tag, TrendingUp } from "lucide-react";

import { DispositionSplit, MoneyCounter, Stat } from "@/components/challenge/day-two/ui";
import { Button } from "@/components/ui/button";
import {
  HIGH_VALUE_EXPOSURE,
  LOSS_ROWS,
  lossValue,
  rupees,
} from "@/lib/challenge/day-two/ledger";
import type { MasterLedger } from "@/lib/challenge/day-two/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The Day 2 master screen.
 *
 * Everything on it is derived from LOSS_ROWS, including the headline, so the
 * table and the total cannot drift apart. The earbuds line is visually
 * dominant because it genuinely is — it is sixty-four per cent of the night —
 * and a variance report that gave equal weight to a ₹520 bread line and an
 * ₹11,997 secure-cage line would be teaching the wrong instinct on sight.
 */
export function LedgerBoard({
  master,
  caseComplete,
  caseSummary,
  onOpenCase,
}: {
  master: MasterLedger;
  caseComplete: boolean;
  caseSummary: { accountedUnits: number; unresolvedValue: number } | null;
  onOpenCase: () => void;
}) {
  const reduced = useReducedMotion();
  const sorted = [...LOSS_ROWS].sort((a, b) => lossValue(b) - lossValue(a));
  const largest = lossValue(sorted[0]!);
  const openCases = LOSS_ROWS.length - (caseComplete ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          label="Unreconciled loss"
          value={<MoneyCounter value={master.unresolvedValue} />}
          tone="alert"
          icon={<TrendingUp className="size-3.5" aria-hidden />}
          hint={
            master.unresolvedValue < master.totalOriginalVariance
              ? `Opened at ${rupees(master.totalOriginalVariance)}`
              : undefined
          }
        />
        <Stat
          label="Affected SKUs"
          value={LOSS_ROWS.length}
          icon={<Boxes className="size-3.5" aria-hidden />}
        />
        <Stat
          label="High-value exposure"
          value={rupees(HIGH_VALUE_EXPOSURE)}
          tone="warn"
          icon={<Tag className="size-3.5" aria-hidden />}
          hint="Units over ₹1,000"
        />
        <Stat
          label="Open cases"
          value={openCases}
          icon={<FileText className="size-3.5" aria-hidden />}
        />
      </div>

      {/* ── The split, once anything has been settled ── */}
      {master.explainedValue + master.recoveredValue > 0 ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easing.outExpo }}
        >
          <DispositionSplit
            explained={master.explainedValue}
            recovered={master.recoveredValue}
            unresolved={master.unresolvedValue}
          />
        </motion.div>
      ) : null}

      {/* ── Product table ── */}
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
            Product-wise loss
          </h2>
          <p className="ml-auto text-[11.5px] text-faint">
            {LOSS_ROWS.length} products · sorted by loss value
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {["Product", "Qty var", "Unit value", "Loss value", "Status"].map((head, i) => (
                  <th
                    key={head}
                    scope="col"
                    className={cn(
                      "px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] text-lo uppercase",
                      i > 0 && "text-right",
                      i === 4 && "text-right",
                    )}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const value = lossValue(row);
                const done = row.playable && caseComplete;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-line last:border-0",
                      row.playable && "bg-alert-500/[0.04]",
                    )}
                  >
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="block text-[13px] font-medium text-hi">
                        {row.product}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-faint">{row.group}</span>
                    </th>
                    <td
                      data-readout
                      className="px-4 py-3 text-right font-mono text-[13px] text-alert-500 tabular-nums"
                    >
                      {row.qtyVariance}
                    </td>
                    <td
                      data-readout
                      className="px-4 py-3 text-right font-mono text-[13px] text-mid tabular-nums"
                    >
                      {rupees(row.unitValue)}
                    </td>
                    <td
                      data-readout
                      className={cn(
                        "px-4 py-3 text-right font-mono text-[13px] font-semibold tabular-nums",
                        row.playable ? "text-alert-500" : "text-mid",
                      )}
                    >
                      {rupees(value)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusChip
                        state={done ? "escalated" : row.playable ? "investigate" : "open"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-alert-500/40 bg-alert-500/[0.05]">
                <th scope="row" colSpan={3} className="px-4 py-3.5 text-left">
                  <span className="text-[13px] font-semibold text-hi">
                    Total unreconciled loss
                  </span>
                </th>
                <td
                  colSpan={2}
                  className="px-4 py-3.5 text-right text-[19px] font-semibold text-alert-500"
                >
                  <MoneyCounter value={master.unresolvedValue} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Contribution ── */}
      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Loss contribution by product
        </h2>
        <ul className="mt-3.5 space-y-2">
          {sorted.map((row) => {
            const value = lossValue(row);
            const share = (value / master.totalOriginalVariance) * 100;
            return (
              <li key={row.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-[11.5px] text-mid sm:w-40">
                  {row.product}
                </span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.span
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${(value / largest) * 100}%` }}
                    transition={{ duration: 0.7, ease: easing.outExpo }}
                    className={cn(
                      "block h-full rounded-full",
                      row.playable ? "bg-alert-500" : "bg-info-500/70",
                    )}
                  />
                </span>
                <span
                  data-readout
                  className="w-[92px] shrink-0 text-right font-mono text-[11.5px] text-mid tabular-nums"
                >
                  {rupees(value)}
                </span>
                <span
                  data-readout
                  className="hidden w-14 shrink-0 text-right font-mono text-[11px] text-faint tabular-nums sm:block"
                >
                  {share.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── The case ── */}
      <CaseCard
        caseComplete={caseComplete}
        caseSummary={caseSummary}
        onOpenCase={onOpenCase}
      />
    </div>
  );
}

function StatusChip({ state }: { state: "open" | "investigate" | "escalated" }) {
  const map = {
    open: { label: "Open", cls: "border-alert-500/35 text-alert-500" },
    investigate: { label: "Investigate", cls: "border-warn-500/40 text-warn-500" },
    escalated: { label: "Escalated", cls: "border-info-500/40 text-info-500" },
  } as const;
  const { label, cls } = map[state];
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function CaseCard({
  caseComplete,
  caseSummary,
  onOpenCase,
}: {
  caseComplete: boolean;
  caseSummary: { accountedUnits: number; unresolvedValue: number } | null;
  onOpenCase: () => void;
}) {
  if (caseComplete && caseSummary) {
    return (
      <section className="rounded-card border border-info-500/35 bg-info-500/[0.05] p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-info-500 uppercase">
          Case 01 · Signed
        </p>
        <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-hi">
          Wireless Earbuds
        </h2>
        <p className="mt-2 text-[13px] text-mid">
          {caseSummary.accountedUnits} of 3 units accounted for ·{" "}
          {rupees(caseSummary.unresolvedValue)} unresolved
        </p>
        <p className="mt-3 text-[12px] text-lo">
          Status: open — escalated to Loss Prevention.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-card border border-alert-500/40 bg-alert-500/[0.05] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-alert-500 uppercase">
            Case 01 · Highest exposure
          </p>
          <h2 className="mt-2 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            Wireless Earbuds variance
          </h2>
          <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
            Secure cage count is short by 3 units. Sixty-four per cent of the
            night&apos;s variance sits in one cage. Start here.
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
            <div>
              <dt className="text-faint">System stock</dt>
              <dd data-readout className="mt-0.5 font-mono text-hi tabular-nums">12</dd>
            </div>
            <div>
              <dt className="text-faint">Physical count</dt>
              <dd className="mt-0.5 font-mono text-warn-500">Pending</dd>
            </div>
            <div>
              <dt className="text-faint">Unit value</dt>
              <dd data-readout className="mt-0.5 font-mono text-hi tabular-nums">₹3,999</dd>
            </div>
            <div>
              <dt className="text-faint">Potential exposure</dt>
              <dd data-readout className="mt-0.5 font-mono text-alert-500 tabular-nums">
                ₹11,997
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Button variant="primary" size="lg" className="mt-5 w-full" onClick={onOpenCase}>
        Open investigation
        <ArrowRight />
      </Button>
    </section>
  );
}

/** Shown after the case is signed — the other six lines, honestly labelled. */
export function NextCases({ unresolvedValue }: { unresolvedValue: number }) {
  return (
    <section className="rounded-card border border-line border-dashed bg-surface p-5">
      <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-lo uppercase">
        <Lock className="size-3" aria-hidden />
        Remaining cases
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-mid">
        Six SKUs and {rupees(unresolvedValue)} are still unreconciled. Fresh food
        damage, packaging drift across similar SKUs and an inbound receiving
        correction are each their own investigation.
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">
        Those cases are not built yet. The earbuds case is complete and is the
        one that carries the method.
      </p>
    </section>
  );
}
