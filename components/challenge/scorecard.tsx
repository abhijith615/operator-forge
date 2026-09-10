"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldAlert } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { DAY_TWO_TEASER } from "@/lib/challenge/day-one";
import { BAND_RANGE } from "@/lib/challenge/scoring";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

function Bar({ score, delay }: { score: number; delay: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <motion.div
        initial={reduced ? { width: `${score}%` } : { width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : delay, ease: easing.outExpo }}
        className={cn(
          "h-full rounded-full",
          score >= 80 ? "bg-ion-500" : score >= 60 ? "bg-ember-500" : "bg-warn-500",
        )}
      />
    </div>
  );
}

export function Scorecard({ result }: { result: ChallengeResult }) {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-8">
      {/* ── Shift complete ── */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Shift complete
        </p>
        <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi">
          You just ran a breakfast peak.
        </h1>
        <ul className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-mid">
          {[
            "Live manpower allocation with a person missing",
            "A fulfillment bottleneck that moved while you watched",
            "An Item Not Found escalation",
            "Packing quality under time pressure",
            "A rider handover you had to decide about",
            "A peak recovery plan of your own design",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-ember-500">·</span>
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Score ── */}
      <section className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          Operator Forge Operational Readiness Score
        </p>
        <p
          data-readout
          className="mt-3 text-[56px] leading-none font-semibold tracking-[-0.05em] text-hi tabular-nums"
        >
          <CountUp to={result.score} duration={reduced ? 0 : 1.4} />
          <span className="text-[22px] text-lo">/100</span>
        </p>
        <p className="mt-3 text-[14px] font-medium text-ember-400">{result.band}</p>
        <p className="mt-1 font-mono text-[11px] text-faint">
          Band range {BAND_RANGE[result.band]}
        </p>
        <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
          A practice assessment from a simulated shift. Not an employment
          certification.
        </p>
      </section>

      {/* ── Signature ── */}
      <section>
        <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          Decision signature
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
              <Bar score={entry.score} delay={0.15 + index * 0.08} />
              <p className="mt-1.5 text-[12px] leading-relaxed text-lo">{entry.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── SOP ── */}
      {result.sopViolations.length > 0 ? (
        <section className="rounded-card border border-alert-500/45 bg-alert-500/[0.06] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-alert-500">
            <ShieldAlert className="size-4" aria-hidden />
            Process integrity
          </p>
          <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-mid">
            {result.sopViolations.map((violation) => (
              <li key={violation.id}>· {violation.label}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-lo">
            These reduced your overall score even where they saved time. In a real
            store they are the decisions that surface days later, in numbers
            nobody traces back to this shift.
          </p>
        </section>
      ) : null}

      {/* ── Feedback ── */}
      {result.strengths.length > 0 ? (
        <FeedbackBlock title="Where you were strong" items={result.strengths} tone="ion" />
      ) : null}
      {result.gaps.length > 0 ? (
        <FeedbackBlock title="Where you lost points" items={result.gaps} tone="warn" />
      ) : null}

      <section>
        <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          If you replayed this shift
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

      {/* ── Day 2 ── */}
      <section className="relative overflow-hidden rounded-card border border-ember-500/30 bg-elevated p-6">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">Day 2</p>
        <p className="mt-3 text-[24px] leading-tight font-semibold tracking-[-0.03em] text-hi">
          {DAY_TWO_TEASER.amount} {DAY_TWO_TEASER.headline}
        </p>
        <p className="mt-2 text-[13.5px] text-mid">{DAY_TWO_TEASER.body}</p>
        <p className="mt-4 text-[12.5px] text-lo">{DAY_TWO_TEASER.hook}</p>
      </section>

      <div className="space-y-2.5">
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/challenge">
            Day 1 complete
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/challenge/leaderboard">See where you stand</Link>
        </Button>
      </div>
    </div>
  );
}

function FeedbackBlock({
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
