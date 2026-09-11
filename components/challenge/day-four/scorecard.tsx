"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { FromTo } from "@/components/challenge/day-four/ui";
import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The Day 4 scorecard. The floor before and after comes first — it is what
 * the operator actually changed — then the reading of how.
 */
export function Day4Scorecard({ result }: { result: ChallengeResult }) {
  const reduced = useReducedMotion();
  const f = result.flow;

  React.useEffect(() => {
    logEvent("scorecard_viewed", { score: result.score, band: result.band }, 4);
  }, [result.score, result.band]);

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <section>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
            Clear the Floor · {f?.lockedByClock ? "Recovery locked by the clock" : "Recovery executed"}
          </p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-hi">Day 4 complete</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            You worked a choking floor back into flow before lunch — or found out exactly where it still chokes.
          </p>
        </section>

        {f ? (
          <section
            className={cn(
              "rounded-card border p-5",
              f.outcome.title === "FLOOR CLEARED" ? "border-ion-500/40 bg-ion-500/[0.05]" : "border-warn-500/40 bg-warn-500/[0.04]",
            )}
          >
            <p className="flex flex-wrap items-center gap-2">
              <span className={cn("font-mono text-[11px] tracking-[0.2em] uppercase", f.outcome.title === "FLOOR CLEARED" ? "text-ion-400" : "text-warn-500")}>
                {f.outcome.title}
              </span>
              {f.outcome.peakReady ? (
                <span className="rounded-full border border-ion-500/50 px-2 py-px font-mono text-[10px] tracking-[0.14em] text-ion-400">PEAK READY</span>
              ) : null}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Fact label="Floor congestion"><FromTo from={f.outcome.congestion.from} to={f.outcome.congestion.to} /></Fact>
              <Fact label="Picker route delay"><FromTo from={f.outcome.routeDelay.from} to={f.outcome.routeDelay.to} unit="s" /></Fact>
              <Fact label="Pick-ready inbound"><FromTo from={f.outcome.pickReady.from} to={f.outcome.pickReady.to} better="up" /></Fact>
              <Fact label="CTD at lunch"><FromTo from={f.outcome.ctd.from} to={f.outcome.ctd.to} unit="s" /></Fact>
              <Fact label="High-demand stock ready">
                <span className="font-mono text-[16px] font-semibold text-hi">{f.outcome.priorityReadiness}%</span>
              </Fact>
              <Fact label="QC breaches">
                <span className={cn("font-mono text-[16px] font-semibold", f.outcome.qcFlags > 0 ? "text-alert-500" : "text-ion-400")}>
                  {f.outcome.qcFlags}
                </span>
              </Fact>
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
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Flow management profile</h2>
          <ul className="mt-3 space-y-3.5">
            {result.competencies.map((entry, index) => (
              <li key={entry.dimension}>
                <div className="flex items-baseline gap-3">
                  <span className="text-[13.5px] font-medium text-hi">{entry.label}</span>
                  <span data-readout className="ml-auto font-mono text-[15px] font-semibold text-hi tabular-nums">{entry.score}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={reduced ? { width: `${entry.score}%` } : { width: 0 }}
                    animate={{ width: `${entry.score}%` }}
                    transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.15 + index * 0.08, ease: easing.outExpo }}
                    className={cn("h-full rounded-full", entry.score >= 80 ? "bg-ion-500" : entry.score >= 60 ? "bg-ember-500" : "bg-warn-500")}
                  />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-lo">{entry.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {f ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">How the floor was run</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Tile
                label="Flow efficiency"
                value={`${f.metrics.flowEfficiency}%`}
                body={
                  f.metrics.flowEfficiency >= 85
                    ? "You kept receiving from feeding work into an already saturated staging area."
                    : "Some of the morning, grocery came off the vehicle faster than stock could leave staging."
                }
                good={f.metrics.flowEfficiency >= 85}
              />
              <Tile
                label="Bottleneck accuracy"
                value={f.metrics.bottleneckAccuracy}
                body="Whether you named the real constraint — the rate stock left staging — and then relieved it."
                good={f.metrics.bottleneckAccuracy === "Strong"}
              />
              <Tile
                label="Floor congestion exposure"
                value={`${f.metrics.congestionMinutes} min`}
                body={`${f.metrics.congestionShare}% of the morning over floor capacity or with Aisle C half-blocked. Lower is better.`}
                good={f.metrics.congestionShare <= 20}
              />
              <Tile
                label="Priority inventory readiness"
                value={`${f.metrics.priorityReadiness}%`}
                body="High-demand stock — milk, curd, cold drinks, snacks — on its shelf when lunch arrived."
                good={f.metrics.priorityReadiness >= 85}
              />
              <Tile
                label="SOP integrity"
                value={`${f.metrics.sopIntegrity}%`}
                body="Cold chain, the QC gate, scan verification and safe staging."
                good={f.metrics.sopIntegrity >= 85}
              />
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Your operating style</h2>
          <p className="mt-2 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">{result.signature.name}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{result.signature.blurb}</p>
        </section>

        {f && f.timeline.length > 0 ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Decision timeline</h2>
            <ol className="mt-3 space-y-2">
              {f.timeline.map((entry) => (
                <li key={`${entry.time}-${entry.text}`} className="flex items-start gap-3">
                  <span className="w-[70px] shrink-0 pt-0.5 font-mono text-[12px] text-faint tabular-nums">{entry.time}</span>
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

        {f?.bestCall ? (
          <section className="rounded-card border border-ion-500/35 bg-ion-500/[0.05] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ion-400 uppercase">Best call</p>
            <p className="mt-2 text-[15px] leading-relaxed text-hi">{f.bestCall.body}</p>
          </section>
        ) : null}

        {f ? (
          <section className="rounded-card border border-warn-500/35 bg-warn-500/[0.04] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-warn-500 uppercase">Development area</p>
            <p className="mt-2 text-[14px] font-semibold text-hi uppercase">{f.developmentArea.area}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{f.developmentArea.body}</p>
            <p className="mt-3 text-[12.5px] text-faint">More activity is not the same as more throughput.</p>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">If you ran this morning again</h2>
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

        <div className="space-y-2.5">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/challenge">
              Day 4 complete
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-[16px]">{children}</dd>
    </div>
  );
}

function Tile({ label, value, body, good }: { label: string; value: string; body: string; good: boolean }) {
  return (
    <div className={cn("rounded-card border bg-surface p-4", good ? "border-ion-500/30" : "border-warn-500/40")}>
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">{label}</p>
      <p data-readout className={cn("mt-2 text-[24px] leading-none font-semibold tabular-nums", good ? "text-ion-400" : "text-warn-500")}>
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-faint">{body}</p>
    </div>
  );
}
