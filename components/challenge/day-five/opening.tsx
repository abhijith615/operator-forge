"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { CustomerJourney } from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { DAY_FIVE_BRIEF, OPENING_MESSAGES, OPENING_ORDERS } from "@/lib/challenge/day-five/scenario";
import { JOURNEY, type JourneyNode, type NodeState } from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * 6:42 PM, and almost no chrome.
 *
 * Five orders run their journeys. One completes; four stop somewhere, and one
 * of those only fails after the customer has it — which is the whole premise.
 * The reveal is about four seconds, a tap skips it, and the first real
 * decision is on the shelf inside half a minute.
 */
export function DayFiveOpening({ onStart }: { onStart: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(reduced ? 6 : 0);

  React.useEffect(() => {
    if (reduced) return;
    const timers = [400, 1100, 1900, 2700, 3400, 4100].map((ms, index) =>
      window.setTimeout(() => setStep((s) => Math.max(s, index + 1)), ms),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced]);

  const skip = () => setStep(6);
  const rise = (visible: boolean) => ({
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    transition: { duration: 0.5, ease: easing.outExpo },
  });

  /**
   * How far each journey has run by a given step, and what state it ends in.
   * The healthy order fades; the four that break stay.
   */
  const statesFor = (breaksAt: JourneyNode | null, progress: number) => {
    const states: Partial<Record<JourneyNode, NodeState>> = {};
    const stopIndex = breaksAt ? JOURNEY.indexOf(breaksAt) : JOURNEY.length - 1;
    JOURNEY.forEach((node, index) => {
      if (index > progress) return;
      if (index < stopIndex) states[node] = "clear";
      else if (index === stopIndex) states[node] = breaksAt === null ? "clear" : breaksAt === "use" ? "broken" : "risk";
    });
    return states;
  };

  const progress = Math.min(JOURNEY.length - 1, step + 1);

  return (
    // Tapping anywhere skips; keyboard and screen-reader users get the button.
    <div className="flex min-h-dvh flex-col bg-void" onClick={step < 6 ? skip : undefined}>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10">
        <motion.p
          {...rise(true)}
          data-readout
          className="font-mono text-[clamp(2.6rem,9vw,4.4rem)] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
        >
          6:42 PM
        </motion.p>

        <motion.div {...rise(step >= 1)} className="mt-5">
          <p className="font-mono text-[11px] tracking-[0.3em] text-ember-500 uppercase">
            Day 5 · {DAY_FIVE_BRIEF.store}
          </p>
          <h1 className="mt-2 text-[clamp(2.1rem,7vw,3.4rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-hi">
            {DAY_FIVE_BRIEF.title}
          </h1>
          <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-mid">{DAY_FIVE_BRIEF.subtitle}</p>
        </motion.div>

        <motion.ul {...rise(step >= 2)} className="mt-7 space-y-2.5" aria-label="Orders in flight">
          {OPENING_ORDERS.map((order, index) => {
            const broken = order.breaksAt !== null;
            const faded = step >= 4 && !broken;
            return (
              <motion.li
                key={order.id}
                animate={{ opacity: faded ? 0.18 : 1 }}
                transition={{ duration: 0.6, ease: easing.outExpo }}
                className={cn(
                  "rounded-card border px-3.5 py-3",
                  step >= 4 && broken ? "border-line-strong bg-surface" : "border-line bg-surface/60",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[11px] text-mid">{order.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[9.5px] tracking-[0.12em] uppercase",
                      step >= 3 && broken ? (order.breaksAt === "use" ? "text-alert-500" : "text-warn-500") : "text-faint",
                    )}
                  >
                    {step >= 3 ? order.note : "In flight"}
                  </span>
                </div>
                <CustomerJourney
                  className="mt-2"
                  compact
                  states={statesFor(
                    (order.breaksAt as JourneyNode | null) ?? null,
                    index === 0 ? JOURNEY.length - 1 : progress,
                  )}
                />
              </motion.li>
            );
          })}
        </motion.ul>

        <motion.div {...rise(step >= 4)} className="mt-7">
          <p className="text-[clamp(1.5rem,5vw,2.1rem)] leading-tight font-semibold tracking-[-0.03em] text-hi">
            {DAY_FIVE_BRIEF.tagline}
          </p>
          <p className="mt-1.5 text-[13px] text-lo">{OPENING_MESSAGES.sub}</p>
        </motion.div>

        <motion.div
          {...rise(step >= 5)}
          className="mt-5 rounded-card border border-ember-500/35 bg-ember-500/[0.05] p-4"
        >
          <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">
            Cluster Manager · 6:42 PM
          </p>
          {OPENING_MESSAGES.manager.map((line) => (
            <p key={line} className="mt-1 text-[15.5px] leading-relaxed text-hi">
              {line}
            </p>
          ))}
        </motion.div>

        <AnimatePresence>
          {step >= 6 ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easing.outExpo }}
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onStart} autoFocus>
                Review the promises
                <ArrowRight />
              </Button>
              <p className="text-[12px] leading-relaxed text-faint">
                Fifteen minutes. Every one of these is technically fine.
              </p>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={skip}
              className="mt-7 self-start rounded px-1 text-[11.5px] text-faint hover:text-lo focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              Skip the introduction
            </button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
