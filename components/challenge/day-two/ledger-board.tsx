"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, FileText, Tag, TrendingUp } from "lucide-react";

import { DispositionSplit, MoneyCounter, Stat } from "@/components/challenge/day-two/ui";
import {
  HIGH_VALUE_EXPOSURE,
  LOSS_ROWS,
  VARIANCE_ROWS,
  formatQty,
  isMatched,
  lossShare,
  lossValue,
  rupees,
  skuLines,
  type LossRow,
} from "@/lib/challenge/day-two/ledger";
import type { MasterLedger } from "@/lib/challenge/day-two/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RowStatus = "open" | "investigate" | "escalated" | "reconciled" | "matched";

/**
 * The Loss Ledger.
 *
 * Everything on it is derived from LOSS_ROWS, including the headline and every
 * percentage, so the table and the total cannot drift apart. A line that spans
 * two SKUs shows both — "+17 / −17", "₹5 / ₹10" — because collapsing it to a
 * single net number would hide exactly the thing its case is about. Record
 * corrections are shown beside the money, never inside it.
 */
export function LedgerBoard({
  master,
  selectedId,
  onSelect,
  completedIds,
  timedOut = false,
  recordUnitsCorrected = 0,
}: {
  master: MasterLedger;
  selectedId: string | null;
  onSelect: (id: string) => void;
  completedIds: string[];
  /** The clock closed the audit, so nothing is still under investigation. */
  timedOut?: boolean;
  /** Inventory record units corrected tonight. A count, not money. */
  recordUnitsCorrected?: number;
}) {
  const reduced = useReducedMotion();
  const sorted = [...LOSS_ROWS].sort((a, b) => lossValue(b) - lossValue(a));
  // Matched lines are in the table — a clean count is a result — but not in
  // the contribution chart, where a zero-width bar is only noise.
  const contributing = sorted.filter((row) => !isMatched(row));
  const largest = lossValue(contributing[0]!);
  const openCases = VARIANCE_ROWS.length - completedIds.length;

  function statusOf(row: LossRow): RowStatus {
    if (completedIds.includes(row.id)) return row.skus ? "reconciled" : "escalated";
    if (isMatched(row)) return "matched";
    return row.playable && !timedOut ? "investigate" : "open";
  }

  return (
    <div className="space-y-3">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
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
          value={VARIANCE_ROWS.length}
          icon={<Boxes className="size-3.5" aria-hidden />}
          hint={`Of ${LOSS_ROWS.length} counted`}
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
          initial={reduced ? false : { y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, ease: easing.outExpo }}
        >
          <DispositionSplit
            explained={master.explainedValue}
            recovered={master.recoveredValue}
            unresolved={master.unresolvedValue}
          />
        </motion.div>
      ) : null}

      {recordUnitsCorrected > 0 ? (
        <p className="flex flex-wrap items-center gap-2 rounded-card border border-ion-500/35 bg-ion-500/[0.05] px-4 py-2.5 text-[12.5px] text-mid">
          <span className="font-mono text-[10px] tracking-[0.14em] text-ion-400 uppercase">
            Records corrected
          </span>
          <span className="font-semibold text-hi">{recordUnitsCorrected} inventory record units</span>
          <span className="text-faint">— a count of records, not money</span>
        </p>
      ) : null}

      {/* ── Product table ── */}
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
            Product-wise loss
          </h2>
          <p className="ml-auto text-[11.5px] text-faint">
            {LOSS_ROWS.length} counted · {VARIANCE_ROWS.length} with variance
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
                    )}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const selected = selectedId === row.id;
                const matched = isMatched(row);
                const lines = skuLines(row);
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelect(row.id)}
                    className={cn(
                      "cursor-pointer border-b border-line transition-colors last:border-0",
                      selected
                        ? "bg-info-500/[0.07]"
                        : row.severity === "critical"
                          ? "bg-alert-500/[0.04] hover:bg-alert-500/[0.07]"
                          : "hover:bg-white/[0.025]",
                    )}
                  >
                    <th scope="row" className="px-4 py-2.5 font-normal">
                      <span className="flex items-center gap-2.5">
                        <span className="relative size-8 shrink-0 overflow-hidden rounded-md border border-line-strong bg-void">
                          <Image
                            src={row.photo}
                            alt=""
                            width={64}
                            height={64}
                            className="size-full object-cover"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-hi">
                            {row.product}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] text-faint">
                            {row.group}
                          </span>
                        </span>
                      </span>
                    </th>
                    <td
                      data-readout
                      className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums whitespace-nowrap"
                    >
                      {lines.map((line, i) => (
                        <React.Fragment key={line.label}>
                          {i > 0 ? <span className="text-faint"> / </span> : null}
                          <span
                            className={
                              line.qtyVariance > 0
                                ? "text-warn-500"
                                : line.qtyVariance < 0
                                  ? "text-alert-500"
                                  : "text-ion-400"
                            }
                          >
                            {formatQty(line.qtyVariance)}
                          </span>
                        </React.Fragment>
                      ))}
                    </td>
                    <td
                      data-readout
                      className="px-4 py-2.5 text-right font-mono text-[13px] whitespace-nowrap text-mid tabular-nums"
                    >
                      {lines.map((line) => rupees(line.unitValue)).join(" / ")}
                    </td>
                    <td
                      data-readout
                      className={cn(
                        "px-4 py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums",
                        row.severity === "critical"
                          ? "text-alert-500"
                          : matched
                            ? "text-faint"
                            : "text-mid",
                      )}
                    >
                      {rupees(lossValue(row))}
                      {row.skus ? (
                        <span className="block text-[10px] font-normal text-faint">net</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusChip state={statusOf(row)} />
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
        <ul className="mt-3.5 space-y-2.5">
          {contributing.map((row) => (
            <li key={row.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[11.5px] text-mid sm:w-36">
                {row.product}
              </span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.span
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${Math.max(1, (lossValue(row) / largest) * 100)}%` }}
                  transition={{ duration: 0.7, ease: easing.outExpo }}
                  className={cn(
                    "block h-full rounded-full",
                    row.severity === "critical" ? "bg-alert-500" : "bg-info-500/70",
                  )}
                />
              </span>
              <span
                data-readout
                className="w-[74px] shrink-0 text-right font-mono text-[11.5px] text-mid tabular-nums"
              >
                {rupees(lossValue(row))}
              </span>
              <span
                data-readout
                className="hidden w-14 shrink-0 text-right font-mono text-[11px] text-faint tabular-nums sm:block"
              >
                {lossShare(row).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2 rounded-card border border-line bg-elevated p-3 text-[11.5px] leading-relaxed text-mid">
          <span aria-hidden className="text-info-500">
            ⓘ
          </span>
          {contributing[0]!.product} account for {lossShare(contributing[0]!).toFixed(1)}% of the
          value. Value is not the only measure: a small line can still carry many wrong records.
        </p>
      </section>
    </div>
  );
}

function StatusChip({ state }: { state: RowStatus }) {
  const map: Record<RowStatus, { label: string; cls: string }> = {
    open: { label: "Open", cls: "border-alert-500/35 text-alert-500" },
    investigate: { label: "Investigate", cls: "border-warn-500/40 text-warn-500" },
    escalated: { label: "Escalated", cls: "border-info-500/40 text-info-500" },
    reconciled: { label: "Reconciled", cls: "border-ion-500/40 text-ion-400" },
    matched: { label: "Matched", cls: "border-ion-500/40 text-ion-400" },
  };
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
