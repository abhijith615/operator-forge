"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  isMatched,
  lossValue,
  recordUnits,
  rupees,
  skuLines,
  type LossRow,
} from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const CASE_NUMBER: Record<string, string> = {
  earbuds: "Case 01 · Highest exposure",
  biscuits: "Case 02 · SKU drift",
};

/**
 * What a queue selection opens.
 *
 * Both variance lines are playable cases. A matched line says plainly that it
 * is clean. Any line added later without a case says it is not built rather
 * than accepting a click and showing a stub.
 */
export function CasePanel({
  row,
  completed,
  summaryLine,
  onOpen,
  onOpenEarbuds,
}: {
  row: LossRow;
  completed: boolean;
  /** What the finished case established, in one line. */
  summaryLine: string | null;
  onOpen: () => void;
  onOpenEarbuds: () => void;
}) {
  const reduced = useReducedMotion();
  const matched = isMatched(row);
  const lines = skuLines(row);
  const split = lines.length > 1;
  const join = (values: string[]) => values.join(" · ");

  const facts: { label: string; value: string; tone?: string }[] = [
    {
      label: "System stock",
      value:
        row.skus || row.systemStock !== undefined
          ? join(lines.map((line) => String(line.systemStock)))
          : "On file",
    },
    {
      label: "Physical count",
      value:
        matched || completed
          ? join(lines.map((line) => String(line.systemStock + line.qtyVariance)))
          : "Pending",
      tone: matched ? "text-ion-400" : completed ? "text-hi" : "text-warn-500",
    },
    { label: "Unit value", value: join(lines.map((line) => rupees(line.unitValue))) },
    matched
      ? { label: "Variance", value: "None", tone: "text-ion-400" }
      : split
        ? { label: "Exposure", value: `${recordUnits(row)} units`, tone: "text-warn-500" }
        : { label: "Exposure", value: rupees(lossValue(row)), tone: "text-alert-500" },
  ];

  return (
    <motion.section
      key={row.id}
      initial={reduced ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className={cn(
        "overflow-hidden rounded-card border",
        completed
          ? split
            ? "border-ion-500/35 bg-ion-500/[0.05]"
            : "border-info-500/35 bg-info-500/[0.05]"
          : matched
            ? "border-ion-500/30 bg-ion-500/[0.04]"
            : row.severity === "critical"
              ? "border-alert-500/40 bg-alert-500/[0.05]"
              : "border-warn-500/35 bg-warn-500/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span className="relative size-[84px] shrink-0 overflow-hidden rounded-card border border-line-strong bg-void">
          <Image
            src={row.photo}
            alt={row.photoAlt}
            width={168}
            height={168}
            className="size-full object-cover"
          />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-mono text-[10px] tracking-[0.2em] uppercase",
              completed
                ? split
                  ? "text-ion-400"
                  : "text-info-500"
                : matched
                  ? "text-ion-400"
                  : row.severity === "critical"
                    ? "text-alert-500"
                    : "text-warn-500",
            )}
          >
            {completed
              ? split
                ? "Reconciled"
                : "Case signed"
              : matched
                ? "Counted · Matches system"
                : row.playable
                  ? (CASE_NUMBER[row.id] ?? row.category)
                  : `${row.category} · Not yet built`}
          </p>
          <h2 className="mt-2 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            {row.caseTitle}
          </h2>
          <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
            {completed && summaryLine ? summaryLine : row.approach}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-obsidian/60 px-4 py-3">
            <dt className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
              {fact.label}
            </dt>
            <dd
              data-readout
              className={cn(
                "mt-1 font-mono text-[14px] font-semibold tabular-nums",
                fact.tone ?? "text-hi",
              )}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line p-4">
        {completed ? (
          <p className="text-[12.5px] text-lo">
            {split
              ? "Reconciled. Both records now match their shelves."
              : "Signed and closed. The remaining lines are still open."}
          </p>
        ) : row.playable ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onOpen}>
            {split ? "Open case" : "Begin count"}
            <ArrowRight />
          </Button>
        ) : matched ? (
          <div className="space-y-3">
            <p className="flex gap-2 text-[12.5px] leading-relaxed text-mid">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ion-400" aria-hidden />
              Physical and system counts agree. This line is clean and carries
              none of tonight&apos;s variance.
            </p>
            <Button variant="secondary" size="md" className="w-full" onClick={onOpenEarbuds}>
              Open the Wireless Earbuds case
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex gap-2 text-[12.5px] leading-relaxed text-mid">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-lo" aria-hidden />
              This case is not built yet. Its variance is real and counts
              towards tonight&apos;s total, but there is nothing to investigate
              here in this release.
            </p>
            <Button variant="secondary" size="md" className="w-full" onClick={onOpenEarbuds}>
              Open the Wireless Earbuds case instead
            </Button>
          </div>
        )}
      </div>
    </motion.section>
  );
}
