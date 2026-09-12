"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

import { CoverageMeter } from "@/components/challenge/day-three/ui";
import { Button } from "@/components/ui/button";
import {
  ACTUAL,
  coverageAt,
  evaluate,
  simulateFlow,
} from "@/lib/challenge/day-three/capacity";
import { paidBookings } from "@/lib/challenge/day-three/engine";
import { EVENING_END, OUTCOME_FROM, at, clockLabel } from "@/lib/challenge/day-three/forecast";
import { ARJUN, FLEX, RIYA } from "@/lib/challenge/day-three/workforce";
import { COVER_LABEL, type CoverLane, type Day3State, type Station } from "@/lib/challenge/day-three/types";
import type { ChallengeResult } from "@/lib/challenge/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LANES: CoverLane[] = ["picking", "packing", "dispatch", "riders"];
/** Two sim-minutes a tick, a tick every 100 ms: 6 PM to 10 PM in twelve seconds. */
const STEP = 2;
const TICK_MS = 100;

interface PeakEvent {
  t: number;
  text: string;
  tone: "neutral" | "good" | "warn";
}

/**
 * The payoff: the next four hours in about twelve seconds.
 *
 * Everything shown is read off the same minute-by-minute run the score is
 * built on, so the amber station at 8:05 is amber because of a decision the
 * operator made at 4:40. No confetti, no failure screen — just the evening
 * the plan produced.
 */
export function PeakSimulation({
  state,
  result,
  onDone,
}: {
  state: Day3State;
  result: ChallengeResult;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const series = React.useMemo(() => evaluate(state, ACTUAL), [state]);
  const flow = React.useMemo(() => simulateFlow(series), [series]);
  const events = React.useMemo(() => buildEvents(state, series), [state, series]);
  const [t, setT] = React.useState(reduced ? EVENING_END : OUTCOME_FROM);
  const finished = t >= EVENING_END;
  const outcome = result.workforce?.outcome;

  React.useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setT((value) => Math.min(EVENING_END, value + STEP)), TICK_MS);
    return () => window.clearInterval(timer);
  }, [finished]);

  const minute = Math.min(t, EVENING_END - 1);
  let handled = 0;
  for (let m = OUTCOME_FROM; m < minute; m += 1) handled += flow.delivered[m] ?? 0;
  const packQueue = Math.round(flow.queues.packing[minute] ?? 0);
  const shown = events.filter((event) => event.t <= t);

  return (
    <div className="min-h-dvh bg-void">
      <main id="main" className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:py-12">
        <header className="flex flex-wrap items-end gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">Onam Eve · The peak</p>
            <p
              data-readout
              className="mt-1 font-mono text-[clamp(2.2rem,8vw,3.4rem)] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
            >
              {clockLabel(minute)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">Orders handled</p>
            <p data-readout className="text-[26px] leading-none font-semibold text-hi tabular-nums">
              {Math.round(handled).toLocaleString("en-IN")}
            </p>
          </div>
          {!finished ? (
            <button
              type="button"
              onClick={() => setT(EVENING_END)}
              className="w-full text-right text-[11.5px] text-lo underline-offset-4 hover:text-mid hover:underline sm:w-auto"
            >
              Skip to 10 PM
            </button>
          ) : null}
        </header>

        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
          <div
            className="h-full bg-ember-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${((t - OUTCOME_FROM) / (EVENING_END - OUTCOME_FROM)) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANES.map((lane) => (
            <CoverageMeter key={lane} lane={lane} value={coverageAt(series, lane, minute)} />
          ))}
        </div>
        <p className="text-[12px] text-lo">
          Packing queue: <span className="font-mono text-mid tabular-nums">{packQueue}</span> orders waiting
        </p>

        <ol className="space-y-1.5" aria-live="polite">
          <AnimatePresence initial={false}>
            {shown.map((event) => (
              <motion.li
                key={`${event.t}-${event.text}`}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: easing.outExpo }}
                className="flex gap-3 text-[13.5px] leading-relaxed"
              >
                <span className="w-[68px] shrink-0 font-mono text-[12px] text-faint tabular-nums">{clockLabel(event.t)}</span>
                <span className={event.tone === "warn" ? "text-warn-500" : event.tone === "good" ? "text-ion-400" : "text-mid"}>
                  {event.text}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>

        {finished && outcome ? (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easing.outExpo }}
            className={cn(
              "rounded-card border p-5",
              outcome.title === "PEAK CLEARED" ? "border-ion-500/45 bg-ion-500/[0.06]" : "border-warn-500/45 bg-warn-500/[0.05]",
            )}
          >
            <p
              className={cn(
                "text-[clamp(1.6rem,5vw,2.2rem)] leading-none font-semibold tracking-[-0.03em]",
                outcome.title === "PEAK CLEARED" ? "text-ion-400" : "text-warn-500",
              )}
            >
              {outcome.title === "PEAK CLEARED" ? "Peak cleared" : "Peak survived"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Metric label="Orders handled · 6–10 PM" value={`${outcome.ordersHandled.toLocaleString("en-IN")} of ${outcome.ordersForecast.toLocaleString("en-IN")}`} />
              <Metric label="Peak staffing coverage" value={`${outcome.peakCoverage}%`} />
              <Metric label="Average packing queue" value={outcome.avgPackingQueue.toFixed(1)} />
              <Metric
                label="Rider coverage · 7–9"
                value={`${outcome.riderCoverage}%${outcome.riderShortageMinutes > 0 ? ` · ${outcome.riderShortageMinutes} min short` : ""}`}
              />
              <Metric label="Temp labour spend" value={rupees(outcome.tempSpend)} />
              <div>
                <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">No critical station abandoned</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-[16px] font-semibold">
                  {outcome.abandonedStation ? (
                    <>
                      <X className="size-4 text-alert-500" aria-hidden />
                      <span className="text-alert-500">{COVER_LABEL[outcome.abandonedStation as Station]}</span>
                    </>
                  ) : (
                    <Check className="size-4 text-ion-400" aria-label="Yes" />
                  )}
                </dd>
              </div>
            </dl>
            <Button variant="primary" size="lg" className="mt-5 w-full" onClick={onDone}>
              See your Day 3 assessment
              <ArrowRight />
            </Button>
          </motion.section>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd data-readout className="mt-1 text-[16px] font-semibold text-hi tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function buildEvents(state: Day3State, series: ReturnType<typeof evaluate>): PeakEvent[] {
  const pct = (lane: CoverLane, t: number) => Math.round(coverageAt(series, lane, t) * 100);
  const events: PeakEvent[] = [
    { t: at(18, 5), text: "The evening builds. Every station is live.", tone: "neutral" },
    { t: at(19, 5), text: "Orders begin rising.", tone: "neutral" },
    {
      t: at(19, 18),
      text: `Picking ${pct("picking", at(19, 18))}% · Packing ${pct("packing", at(19, 18))}%`,
      tone: Math.min(pct("picking", at(19, 18)), pct("packing", at(19, 18))) >= 95 ? "good" : "warn",
    },
    {
      t: at(19, 35),
      text: `Rider demand peaks — ${series.riderCount[at(19, 35)] ?? 0} riders on the road for ${Math.ceil(series.riderNeed[at(19, 35)] ?? 0)} needed.`,
      tone: (series.riderCount[at(19, 35)] ?? 0) >= Math.ceil(series.riderNeed[at(19, 35)] ?? 0) ? "good" : "warn",
    },
  ];

  const paid = paidBookings(state);
  const booked = FLEX.filter((worker) => paid.includes(worker.id)).map((worker) => worker.name);
  events.push(
    booked.length > 0
      ? {
          t: at(19, 52),
          text: `${booked.length > 1 ? `${booked.slice(0, -1).join(", ")} and ${booked[booked.length - 1]}` : booked[0]} absorb the queue.`,
          tone: "good",
        }
      : { t: at(19, 52), text: "No flex on the floor. The regulars carry the queue alone.", tone: "warn" },
  );

  // The two people decisions, landing where they actually land.
  const riyaActions = state.people.riya.interventions;
  if (riyaActions.includes("remove")) {
    events.push({ t: at(18, 10), text: "Riya is off picking. Her zone goes to whoever is nearest.", tone: "warn" });
  } else if (riyaActions.includes("packing")) {
    events.push({ t: at(18, 10), text: "Riya is on packing, a station she has never worked.", tone: "warn" });
  } else if (riyaActions.includes("zone")) {
    events.push({ t: at(18, 10), text: `Riya works her fastest zone at ${RIYA.zone} seconds a pick.`, tone: "good" });
  } else if (riyaActions.includes("pair")) {
    events.push({ t: at(18, 10), text: "Riya spends half an hour picking beside an expert.", tone: "good" });
  } else {
    events.push({ t: at(18, 10), text: `Riya holds ${RIYA.today} seconds a pick in Zone C.`, tone: "neutral" });
  }

  events.push(
    state.people.arjun.outcome === "extended"
      ? { t: ARJUN.rotaEnd, text: "Arjun's rota ends — and he stays on picking to 10.", tone: "good" }
      : { t: ARJUN.rotaEnd, text: "Arjun clocks out at 8. Picking loses its fastest hands.", tone: "warn" },
  );

  if (state.auditStart < EVENING_END) {
    events.push({ t: state.auditStart, text: "Two pickers leave the floor for the inventory audit.", tone: "warn" });
  }
  if (state.riders.nearby > 0) {
    events.push({ t: at(20, 45), text: "Store 117's riders head back to their own store.", tone: "neutral" });
  }

  const t805 = at(20, 5);
  const worst = (["picking", "packing", "dispatch", "riders"] as CoverLane[]).reduce((low, lane) =>
    coverageAt(series, lane, t805) < coverageAt(series, low, t805) ? lane : low,
  );
  events.push(
    coverageAt(series, worst, t805) < 0.95
      ? { t: t805, text: `${COVER_LABEL[worst]} turns amber at ${pct(worst, t805)}%.`, tone: "warn" }
      : { t: t805, text: "Every station holding.", tone: "good" },
  );
  events.push({ t: at(20, 35), text: "Demand begins falling.", tone: "neutral" });
  events.push({ t: at(21, 30), text: "The last of the festival baskets leave the building.", tone: "neutral" });

  return events.sort((a, b) => a.t - b.t);
}
