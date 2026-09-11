"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { DispositionSplit } from "@/components/challenge/day-two/ui";
import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { DAY_THREE_TEASER } from "@/lib/challenge/day-three/workforce";
import { rupees } from "@/lib/challenge/day-two/ledger";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const EARBUDS_WORK = [
  "A physical count of a secure cage, taken rather than assumed",
  "A movement trail rebuilt from the system's own record",
  "An order that completed without its high-value scan",
  "A camera window covering the moment stock left the cage",
  "Cancelled-order stock standing in an exception tote",
  "A plan for the unit nobody could account for",
];

const PARLEG_WORK = [
  "Two adjacent shelves counted, and one pattern read across them",
  "A pick log filtered down to the scans that never happened",
  "A wrong-size pick rebuilt from a single transaction",
  "Two SKUs reconciled, and the control that bent them put back",
];

/**
 * The Day 2 scorecard.
 *
 * It leads with the reconciliation rather than the score, because the
 * reconciliation is the thing the learner actually produced and the score is
 * our reading of it. Money and records are reported separately: the value
 * split never includes record units, and record units are never shown in
 * rupees. Dimensions only Case 02 reads are listed as not reached when it was
 * not reached, rather than scored as zero.
 */
export function Day2Scorecard({ result }: { result: ChallengeResult }) {
  const reduced = useReducedMotion();
  const f = result.forensics;
  const pg = f?.parleg;

  const heading = f?.timedOut
    ? "The clock closed the audit."
    : pg?.reconciled
      ? "You worked tonight's variances to the bottom."
      : "You reconciled a high-value variance.";

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <section>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
            {f?.timedOut ? "Day 2 · Audit closed at time" : "Day 2 · Audit signed"}
          </p>
          <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            {heading}
          </h1>
          <ul className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-mid">
            {[...EARBUDS_WORK, ...(pg ? PARLEG_WORK : [])].map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="text-ember-500">
                  ·
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Money, before the score ── */}
        {f ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
              Value accounted for
            </h2>
            <p className="mt-2 mb-3.5 text-[12.5px] leading-relaxed text-mid">
              Opened at {rupees(f.originalVariance)} across the lines that did not
              match. These three are different outcomes and are never added together.
            </p>
            <DispositionSplit
              explained={f.explainedValue}
              recovered={f.recoveredValue}
              unresolved={f.unresolvedValue}
            />
            <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
              Earbuds: {f.caseExplainedUnits} explained, {f.caseRecoveredUnits} recovered,{" "}
              {f.caseUnresolvedUnits} unresolved against an exposure of {rupees(f.caseExposure)}.
              {pg
                ? pg.rootCauseEstablished && pg.reconciled
                  ? ` Parle-G: ${rupees(pg.netValueImpact)} explained as wrong-size picking.`
                  : ` Parle-G: ${rupees(pg.netValueImpact)} still unexplained — the cause was not established.`
                : ""}
            </p>
          </section>
        ) : null}

        {/* ── Records, beside the money ── */}
        {pg ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
              Inventory records
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div
                className={cn(
                  "rounded-card border bg-surface p-4",
                  pg.reconciled ? "border-ion-500/35" : "border-warn-500/40",
                )}
              >
                <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
                  Record units corrected
                </p>
                <p
                  data-readout
                  className={cn(
                    "mt-2 text-[24px] leading-none font-semibold tabular-nums",
                    pg.reconciled ? "text-ion-400" : "text-warn-500",
                  )}
                >
                  {pg.recordUnitsCorrected}
                  <span className="text-[15px] text-lo">/{pg.recordUnitsAffected}</span>
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
                  Transactions affected
                </p>
                <p data-readout className="mt-2 text-[24px] leading-none font-semibold text-hi tabular-nums">
                  {pg.affectedTransactions}
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
                  Preventive controls
                </p>
                {pg.preventiveControls.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[12px] leading-snug text-mid">
                    {pg.preventiveControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[12.5px] text-warn-500">None selected</p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Score ── */}
        <section className="rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            Operator Forge Investigative Readiness Score
          </p>
          <p
            data-readout
            className="mt-3 text-[56px] leading-none font-semibold tracking-[-0.05em] text-hi tabular-nums"
          >
            <CountUp to={result.score} duration={reduced ? 0 : 1.4} />
            <span className="text-[22px] text-lo">/100</span>
          </p>
          <p className="mt-3 text-[14px] font-medium text-ember-400">{result.band}</p>
          <p className="mt-1 font-mono text-[11px] text-faint">Band range {result.bandRange}</p>
          <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
            A practice assessment from a simulated audit. Not an employment certification.
          </p>
        </section>

        {/* ── How the work was done ── */}
        {f ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
              How you worked
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
                  Evidence efficiency · Case 01
                </p>
                <p
                  data-readout
                  className="mt-2 text-[24px] leading-none font-semibold text-hi tabular-nums"
                >
                  {f.usefulActions}
                  <span className="text-[15px] text-lo">/{f.totalActions}</span>
                  <span className="ml-2 text-[15px] text-mid">
                    {Math.round(f.evidenceEfficiency * 100)}%
                  </span>
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                  Records you opened that could move the case, over everything you opened. Not
                  folded into the score — reading widely and arriving at the truth is not a
                  failure.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-card border bg-surface p-4",
                  f.unsupportedFindings > 0 ? "border-warn-500/40" : "border-line",
                )}
              >
                <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
                  Conclusions ahead of evidence
                </p>
                <p
                  data-readout
                  className={cn(
                    "mt-2 text-[24px] leading-none font-semibold tabular-nums",
                    f.unsupportedFindings > 0 ? "text-warn-500" : "text-ion-400",
                  )}
                >
                  {f.unsupportedFindings}
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                  Findings you committed to before the tray held the records that support them.
                  This one does affect the score.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Signature ── */}
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            Investigative signature
          </h2>
          <p className="mt-2 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            {result.signature.name}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{result.signature.blurb}</p>
        </section>

        {/* ── Competencies ── */}
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            Competencies
          </h2>
          <ul className="mt-3 space-y-3.5">
            {result.competencies.map((entry, index) => (
              <li key={entry.dimension}>
                <div className="flex items-baseline gap-3">
                  <span className="text-[13.5px] font-medium text-hi">{entry.label}</span>
                  <span
                    data-readout
                    className="ml-auto font-mono text-[15px] font-semibold text-hi tabular-nums"
                  >
                    {entry.score}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={reduced ? { width: `${entry.score}%` } : { width: 0 }}
                    animate={{ width: `${entry.score}%` }}
                    transition={{
                      duration: reduced ? 0 : 0.8,
                      delay: reduced ? 0 : 0.15 + index * 0.08,
                      ease: easing.outExpo,
                    }}
                    className={cn(
                      "h-full rounded-full",
                      entry.score >= 80
                        ? "bg-ion-500"
                        : entry.score >= 60
                          ? "bg-ember-500"
                          : "bg-warn-500",
                    )}
                  />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-lo">{entry.blurb}</p>
              </li>
            ))}
          </ul>
          {f?.dimensionsNotReached && f.dimensionsNotReached.length > 0 ? (
            <p className="mt-4 rounded-card border border-line border-dashed px-4 py-3 text-[12px] leading-relaxed text-faint">
              Not read on this run: {f.dimensionsNotReached.join(", ")}. Case 02 assesses these,
              and it was not reached — they are left out of the score, not scored as zero.
            </p>
          ) : null}
        </section>

        {result.strengths.length > 0 ? (
          <Block title="Where you were strong" items={result.strengths} tone="ion" />
        ) : null}
        {result.gaps.length > 0 ? (
          <Block title="Where you lost points" items={result.gaps} tone="warn" />
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            If you ran this audit again
          </h2>
          <ol className="mt-3 space-y-2.5">
            {result.replay.map((line, index) => (
              <li key={line} className="flex gap-3 text-[13px] leading-relaxed text-mid">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-ember-500/40 font-mono text-[10.5px] text-ember-400">
                  {index + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
            What you learned today
          </h2>
          <ul className="mt-3 space-y-3">
            {result.learned.map((item) => (
              <li key={item.title} className="rounded-card border border-line bg-surface p-3.5">
                <p className="text-[13.5px] font-semibold text-hi">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Day 3 ── */}
        <section className="rounded-card border border-ember-500/30 bg-elevated p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
            {DAY_THREE_TEASER.eyebrow}
          </p>
          <p className="mt-3 text-[22px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            {DAY_THREE_TEASER.headline}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mid">{DAY_THREE_TEASER.body}</p>
          <Button asChild variant="secondary" size="md" className="mt-4">
            <Link href="/challenge/day-3">
              Open Day 3
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <div className="space-y-2.5">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/challenge">
              Day 2 complete
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/challenge/leaderboard">See where you stand</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function Block({
  title,
  items,
  tone,
}: {
  title: string;
  items: { title: string; body: string }[];
  tone: "ion" | "warn";
}) {
  return (
    <section>
      <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">{title}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item.title}
            className={cn(
              "rounded-card border-l-2 bg-surface py-3 pr-3.5 pl-4",
              tone === "ion" ? "border-l-ion-500" : "border-l-warn-500",
            )}
          >
            <p className="text-[13.5px] font-semibold text-hi">{item.title}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
