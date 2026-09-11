"use client";

import * as React from "react";
import Image from "next/image";
import { BarChart3, ChevronRight, Package } from "lucide-react";

import {
  LOSS_ROWS,
  VARIANCE_ROWS,
  isMatched,
  lossValue,
  recordUnits,
  rupees,
  type LossRow,
} from "@/lib/challenge/day-two/ledger";
import { cn } from "@/lib/utils";

/**
 * The audit queue.
 *
 * Four lines were counted tonight and the operator picks which to open. Two
 * carry a variance and two matched — a clean line is a result, and seeing it
 * next to the problems is part of reading a report. The cards deliberately do
 * not rank themselves beyond showing the money; the sort is by exposure
 * because that is the honest order for a variance report, not a nudge.
 *
 * Both variance lines are playable cases, and which to open first is itself a
 * small prioritisation signal: the secure cage carries the money, the biscuit
 * bay carries more wrong records.
 */
export function AuditQueue({
  selectedId,
  onSelect,
  completedIds,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  completedIds: string[];
}) {
  const sorted = [...LOSS_ROWS].sort((a, b) => lossValue(b) - lossValue(a));

  return (
    <div className="flex min-h-0 flex-col">
      <header className="shrink-0 px-4 py-3.5">
        <h2 className="text-[15px] leading-none font-semibold tracking-[-0.01em] text-hi">
          Audit queue
        </h2>
        <p className="mt-1.5 text-[11.5px] text-lo">
          {LOSS_ROWS.length} counted · {VARIANCE_ROWS.length} with variance
        </p>
      </header>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {sorted.map((row) => (
          <li key={row.id}>
            <QueueCard
              row={row}
              selected={selectedId === row.id}
              completed={completedIds.includes(row.id)}
              onSelect={() => onSelect(row.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueCard({
  row,
  selected,
  completed,
  onSelect,
}: {
  row: LossRow;
  selected: boolean;
  completed: boolean;
  onSelect: () => void;
}) {
  const critical = row.severity === "critical";
  const matched = isMatched(row);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full overflow-hidden rounded-card border text-left transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian focus-visible:outline-none",
        selected
          ? "border-info-500/60 bg-info-500/[0.07]"
          : "border-line bg-surface hover:border-line-bright hover:bg-white/[0.025]",
      )}
    >
      {/* Chips */}
      <span className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3">
        <Chip tone={matched ? "done" : critical ? "high" : "neutral"}>{row.category}</Chip>
        {matched ? null : (
          <Chip tone={critical ? "critical" : "medium"}>
            {critical ? "Critical" : "Medium"}
          </Chip>
        )}
        {completed ? <Chip tone="done">{row.skus ? "Reconciled" : "Signed"}</Chip> : null}
      </span>

      {/* Body */}
      <span className="flex items-start gap-3 px-3.5 pt-2.5 pb-3">
        <span className="relative grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-lg border border-line-strong bg-void">
          <Image
            src={row.photo}
            alt={row.photoAlt}
            width={104}
            height={104}
            className="size-full object-cover"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-snug font-semibold text-hi">
            {row.caseTitle}
          </span>
          <span className="mt-1 block text-[11.5px] leading-relaxed text-mid">
            {row.note}
          </span>
        </span>

        <ChevronRight
          className={cn(
            "mt-1 size-4 shrink-0 transition-colors",
            selected ? "text-info-500" : "text-lo",
          )}
          aria-hidden
        />
      </span>

      {/* Footer */}
      <span className="flex items-center gap-3 border-t border-line px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-faint">
          <Package className="size-3 shrink-0" aria-hidden />
          <span className="truncate">SKU group: {row.group}</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-faint">
          <BarChart3 className="size-3" aria-hidden />
          <span data-readout className="tabular-nums">
            {matched
              ? "No variance"
              : row.skus
                ? `${recordUnits(row)} units · ${rupees(lossValue(row))} net`
                : `Est. loss: ${rupees(lossValue(row))}`}
          </span>
        </span>
      </span>
    </button>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "high" | "critical" | "medium" | "neutral" | "done";
  children: React.ReactNode;
}) {
  const cls = {
    high: "border-info-500/40 bg-info-500/10 text-info-500",
    critical: "border-alert-500/40 bg-alert-500/10 text-alert-500",
    medium: "border-warn-500/40 bg-warn-500/10 text-warn-500",
    neutral: "border-line-strong text-mid",
    done: "border-ion-500/40 bg-ion-500/10 text-ion-400",
  }[tone];

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.08em] uppercase",
        cls,
      )}
    >
      {children}
    </span>
  );
}
