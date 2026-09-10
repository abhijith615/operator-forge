"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { lossValue, rupees, type LossRow } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * What a queue selection opens.
 *
 * For the earbuds this is the way in. For the other three it is an honest
 * dead end: their numbers are real and their approach is described, and the
 * panel says the case is not built rather than accepting a click and showing
 * a stub. A learner who is told "coming soon" once trusts the rest of the
 * product; a learner who opens an empty case does not.
 */
export function CasePanel({
  row,
  completed,
  summary,
  onOpen,
  onOpenEarbuds,
}: {
  row: LossRow;
  completed: boolean;
  summary: { accountedUnits: number; unresolvedValue: number } | null;
  onOpen: () => void;
  onOpenEarbuds: () => void;
}) {
  const reduced = useReducedMotion();
  const exposure = lossValue(row);

  const facts: { label: string; value: string; tone?: string }[] = [
    { label: "System stock", value: row.id === "earbuds" ? "12" : "On file" },
    {
      label: "Physical count",
      value: completed ? String(12 - Math.abs(row.qtyVariance)) : "Pending",
      tone: completed ? "text-hi" : "text-warn-500",
    },
    { label: "Unit value", value: rupees(row.unitValue) },
    { label: "Exposure", value: rupees(exposure), tone: "text-alert-500" },
  ];

  return (
    <motion.section
      key={row.id}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className={cn(
        "overflow-hidden rounded-card border",
        completed
          ? "border-info-500/35 bg-info-500/[0.05]"
          : row.playable
            ? "border-alert-500/40 bg-alert-500/[0.05]"
            : "border-line bg-surface",
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
                ? "text-info-500"
                : row.playable
                  ? "text-alert-500"
                  : "text-lo",
            )}
          >
            {completed
              ? "Case signed"
              : row.playable
                ? "Case 01 · Highest exposure"
                : `${row.category} · Not yet built`}
          </p>
          <h2 className="mt-2 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            {row.caseTitle}
          </h2>
          <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
            {completed
              ? `${summary?.accountedUnits ?? 0} of ${Math.abs(row.qtyVariance)} units accounted for. ${rupees(summary?.unresolvedValue ?? 0)} unresolved and escalated to Loss Prevention.`
              : row.approach}
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
            Signed and closed. The remaining lines are still open.
          </p>
        ) : row.playable ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onOpen}>
            Begin count
            <ArrowRight />
          </Button>
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
