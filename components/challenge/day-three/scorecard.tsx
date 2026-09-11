"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { DAY_FOUR_TEASER } from "@/lib/challenge/day-four/scenario";
import { logEvent } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The Day 3 scorecard.
 *
 * It opens with what the plan did — the peak it produced — before the score,
 * because the peak is the thing the operator built and the score is our
 * reading of how. Every line below the profile is about a decision they
 * actually made.
 */
export function Day3Scorecard({ result }: { result: ChallengeResult }) {
  const reduced = useReducedMotion();
  const w = result.workforce;

  React.useEffect(() => {
    logEvent("scorecard_viewed", { score: result.score, band: result.band }, 3);
  }, [result.score, result.band]);

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <section>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
            Onam Eve · {w?.lockedByClock ? "Plan locked by the clock" : "Shift plan locked"}
          </p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            Day 3 complete
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            You built a team for a festival peak with five people missing, then kept it standing while the evening changed it.
          </p>
        </section>

        {w ? (
          <section
            className={cn(
              "rounded-card border p-5",
              w.outcome.title === "PEAK CLEARED" ? "border-ion-500/40 bg-ion-500/[0.05]" : "border-warn-500/40 bg-warn-500/[0.04]",
            )}
          >
            <p
              className={cn(
                "font-mono text-[11px] tracking-[0.2em] uppercase",
                w.outcome.title === "PEAK CLEARED" ? "text-ion-400" : "text-warn-500",
              )}
            >
              {w.outcome.title}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Fact label="Orders handled · 6–10 PM" value={`${w.outcome.ordersHandled.toLocaleString("en-IN")} / ${w.outcome.ordersForecast.toLocaleString("en-IN")}`} />
              <Fact label="Peak coverage" value={`${w.outcome.peakCoverage}%`} />
              <Fact label="Avg packing queue" value={w.outcome.avgPackingQueue.toFixed(1)} />
              <Fact label="Rider coverage" value={`${w.outcome.riderCoverage}%`} />
              <Fact label="Temp labour" value={rupees(w.outcome.tempSpend)} />
              <Fact label="Rider support" value={rupees(w.outcome.riderSpend)} />
            </dl>
          </section>
        ) : null}

        <section className="rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Operational readiness</p>
          <p data-readout className="mt-3 text-[56px] leading-none font-semibold tracking-[-0.05em] text-hi tabular-nums">
            <CountUp to={result.score} duration={reduced ? 0 : 1.4} />
            <span className="text-[22px] text-lo">/100</span>
          </p>
          <p className="mt-3 text-[14px] font-medium text-ember-400">{result.band}</p>
          <p className="mt-1 font-mono text-[11px] text-faint">Band range {result.bandRange}</p>
          <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
            A practice assessment from a simulated shift. Not an employment certification.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Workforce leadership profile</h2>
          <ul className="mt-3 space-y-3.5">
            {result.competencies.map((entry, index) => (
              <li key={entry.dimension}>
                <div className="flex items-baseline gap-3">
                  <span className="text-[13.5px] font-medium text-hi">{entry.label}</span>
                  <span data-readout className="ml-auto font-mono text-[15px] font-semibold text-hi tabular-nums">
                    {entry.score}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={reduced ? { width: `${entry.score}%` } : { width: 0 }}
                    animate={{ width: `${entry.score}%` }}
                    transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.15 + index * 0.08, ease: easing.outExpo }}
                    className={cn(
                      "h-full rounded-full",
                      entry.score >= 80 ? "bg-ion-500" : entry.score >= 60 ? "bg-ember-500" : "bg-warn-500",
                    )}
                  />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-lo">{entry.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {w ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">How the plan was built</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Tile
                label="Capacity anticipation"
                value={`${w.metrics.capacityAnticipation}%`}
                body={`${w.metrics.capacityAnticipation}% of the peak's predictable gaps were closed during planning, before the first disruption.`}
                tone={w.metrics.capacityAnticipation >= 70 ? "ion" : "warn"}
              />
              <Tile
                label="Skill utilisation"
                value={`${w.metrics.skillUtilisation}%`}
                body="How much of your experts' and cross-trained people's skill landed where it was scarce."
                tone={w.metrics.skillUtilisation >= 85 ? "ion" : "warn"}
              />
              <Tile
                label="Peak coverage"
                value={`${w.metrics.peakCoverage}%`}
                body="Average critical-station coverage, 6–10 PM: picking, packing, dispatch and riders."
                tone={w.metrics.peakCoverage >= 95 ? "ion" : "warn"}
              />
              <Tile
                label="Flex labour efficiency"
                value={w.metrics.flexEfficiency === null ? "No flex" : `${w.metrics.flexEfficiency}%`}
                body={
                  w.metrics.flexEfficiency === null
                    ? "No temporary labour was booked."
                    : `${w.metrics.flexUsefulHours} of ${w.metrics.flexHours} flex hours landed where a station was short. ${rupees(w.outcome.tempSpend)} of a ${rupees(w.metrics.flexBudget)} budget.`
                }
                tone={w.metrics.flexEfficiency === null || w.metrics.flexEfficiency >= 75 ? "ion" : "warn"}
              />
            </div>
            <div className="mt-2 rounded-card border border-line bg-surface p-4">
              <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">People risk</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <Risk ok={w.risks.fatigue === "Low"} text={`Rider fatigue: ${w.risks.fatigue}`} />
                <Risk
                  ok={w.risks.untrainedAssignments === 0}
                  text={
                    w.risks.untrainedAssignments === 0
                      ? "Nobody on an untrained station"
                      : `${w.risks.untrainedAssignments} on an untrained station`
                  }
                />
                <Risk ok={!w.risks.expertDependency} text={w.risks.expertDependency ? "Over-dependent on one expert" : "No single-expert dependency"} />
                <Risk ok={!w.risks.unnecessaryRemoval} text={w.risks.unnecessaryRemoval ? "A capable worker removed" : "Nobody removed unnecessarily"} />
              </ul>
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Management style</h2>
          <p className="mt-2 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">{result.signature.name}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{result.signature.blurb}</p>
        </section>

        {w && w.timeline.length > 0 ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Decision timeline</h2>
            <ol className="mt-3 space-y-2">
              {w.timeline.map((entry) => (
                <li key={`${entry.time}-${entry.text}`} className="flex items-start gap-3">
                  <span className="w-[64px] shrink-0 pt-0.5 font-mono text-[12px] text-faint tabular-nums">{entry.time}</span>
                  {entry.tone === "good" ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-ion-400" aria-label="Strong decision" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-500" aria-label="Weaker decision" />
                  )}
                  <span className="text-[13.5px] leading-relaxed text-hi">{entry.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {w?.bestCall ? (
          <section className="rounded-card border border-ion-500/35 bg-ion-500/[0.05] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ion-400 uppercase">Best call</p>
            <p className="mt-2 text-[15px] leading-relaxed text-hi">{w.bestCall.body}</p>
          </section>
        ) : null}

        {w ? (
          <section className="rounded-card border border-warn-500/35 bg-warn-500/[0.04] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-warn-500 uppercase">Development area</p>
            <p className="mt-2 text-[14px] font-semibold text-hi uppercase">{w.developmentArea.area}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{w.developmentArea.body}</p>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">If you ran this shift again</h2>
          <ol className="mt-3 space-y-2.5">
            {result.replay.map((line, index) => (
              <li key={line} className="flex gap-3 text-[13.5px] leading-relaxed text-mid">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-ember-500/40 font-mono text-[10.5px] text-ember-400">
                  {index + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">What you learned today</h2>
          <ul className="mt-3 space-y-3">
            {result.learned.map((item) => (
              <li key={item.title} className="rounded-card border border-line bg-surface p-3.5">
                <p className="text-[13.5px] font-semibold text-hi">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Day 4 ── */}
        <section className="rounded-card border border-ember-500/30 bg-elevated p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">{DAY_FOUR_TEASER.eyebrow}</p>
          <p className="mt-3 text-[22px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            {DAY_FOUR_TEASER.headline}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mid">{DAY_FOUR_TEASER.body}</p>
          <Button asChild variant="secondary" size="md" className="mt-4">
            <Link href="/challenge/day-4">
              Open Day 4
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <div className="space-y-2.5">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/challenge">
              Day 3 complete
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd data-readout className="mt-1 text-[17px] font-semibold text-hi tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function Tile({ label, value, body, tone }: { label: string; value: string; body: string; tone: "ion" | "warn" }) {
  return (
    <div className={cn("rounded-card border bg-surface p-4", tone === "ion" ? "border-ion-500/30" : "border-warn-500/40")}>
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">{label}</p>
      <p data-readout className={cn("mt-2 text-[24px] leading-none font-semibold tabular-nums", tone === "ion" ? "text-ion-400" : "text-warn-500")}>
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-faint">{body}</p>
    </div>
  );
}

function Risk({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-[12.5px]", ok ? "text-mid" : "text-warn-500")}>
      {ok ? <Check className="size-3.5 text-ion-400" aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
      {text}
    </li>
  );
}
