"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { FloorMap } from "@/components/challenge/day-four/floor-map";
import { FlowMetrics, FromTo } from "@/components/challenge/day-four/ui";
import { Button } from "@/components/ui/button";
import { layoutOf, metricsOf } from "@/lib/challenge/day-four/floor";
import { clockAt } from "@/lib/challenge/day-four/scenario";
import type { Day4State } from "@/lib/challenge/day-four/types";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FRAME_MS = 850;

/**
 * The last twelve minutes, played back on the floor itself — about ten
 * seconds. Every frame is a minute the engine actually ran on the operator's
 * sequence: cartons leave the aisle because the plan cleared it, not because
 * the ending is scripted.
 */
export function RecoveryExecution({
  start,
  frames,
  result,
  compact,
  onDone,
}: {
  start: Day4State;
  frames: Day4State[];
  result: ChallengeResult;
  compact: boolean;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = React.useState(reduced ? frames.length : 0);
  const finished = index >= frames.length;
  const current = index === 0 ? start : (frames[Math.min(index, frames.length) - 1] ?? start);
  const layout = layoutOf(current);
  const metrics = metricsOf(current);
  const outcome = result.flow?.outcome;

  React.useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setIndex((value) => Math.min(frames.length, value + 1)), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [finished, frames.length]);

  return (
    <div className="min-h-dvh bg-void">
      <main id="main" className="mx-auto max-w-6xl space-y-4 px-3 py-6 sm:px-4 sm:py-8">
        <header className="flex flex-wrap items-end gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">Executing recovery</p>
            <p data-readout className="mt-1 font-mono text-[clamp(2rem,7vw,3rem)] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums">
              {clockAt(current.t)}
            </p>
          </div>
          {!finished ? (
            <button
              type="button"
              onClick={() => setIndex(frames.length)}
              className="ml-auto text-[11.5px] text-lo underline-offset-4 hover:text-mid hover:underline"
            >
              Skip to 11:00
            </button>
          ) : null}
        </header>

        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
          <div className="h-full bg-ember-500 transition-[width] duration-300 ease-linear" style={{ width: `${(index / frames.length) * 100}%` }} />
        </div>

        <div className="rounded-card border border-line bg-surface p-3">
          <FlowMetrics metrics={metrics} compact={compact} />
        </div>

        <div className="overflow-hidden rounded-card border border-line">
          <div className="overflow-x-auto">
            <div className="min-w-[620px] sm:min-w-0">
              <FloorMap state={current} layout={layout} metrics={metrics} compact={compact} caption={clockAt(current.t)} />
            </div>
          </div>
        </div>

        {finished && outcome ? (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easing.outExpo }}
            className={cn(
              "rounded-card border p-5",
              outcome.title === "FLOOR CLEARED" ? "border-ion-500/45 bg-ion-500/[0.06]" : "border-warn-500/45 bg-warn-500/[0.05]",
            )}
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <p
                className={cn(
                  "text-[clamp(1.6rem,5vw,2.2rem)] leading-none font-semibold tracking-[-0.03em]",
                  outcome.title === "FLOOR CLEARED" ? "text-ion-400" : "text-warn-500",
                )}
              >
                {outcome.title === "FLOOR CLEARED" ? "Floor cleared" : outcome.title === "FLOOR STABILISED" ? "Floor stabilised" : "Floor under pressure"}
              </p>
              {outcome.peakReady ? (
                <span className="rounded-full border border-ion-500/50 px-2.5 py-0.5 font-mono text-[11px] tracking-[0.14em] text-ion-400">PEAK READY</span>
              ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
              <Metric label="Floor congestion">
                <FromTo from={outcome.congestion.from} to={outcome.congestion.to} />
              </Metric>
              <Metric label="Picker route delay">
                <FromTo from={outcome.routeDelay.from} to={outcome.routeDelay.to} unit="s" />
              </Metric>
              <Metric label="Pick-ready inbound">
                <FromTo from={outcome.pickReady.from} to={outcome.pickReady.to} better="up" />
              </Metric>
              <Metric label="CTD at lunch">
                <FromTo from={outcome.ctd.from} to={outcome.ctd.to} unit="s" />
              </Metric>
              <Metric label="QC breaches">
                <span className={cn("font-mono text-[16px] font-semibold", outcome.qcFlags > 0 ? "text-alert-500" : "text-ion-400")}>
                  {outcome.qcFlags}
                </span>
              </Metric>
            </dl>
            <Button variant="primary" size="lg" className="mt-5 w-full" onClick={onDone}>
              See your Day 4 assessment
              <ArrowRight />
            </Button>
          </motion.section>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-[16px]">{children}</dd>
    </div>
  );
}
