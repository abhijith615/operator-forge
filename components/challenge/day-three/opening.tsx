"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MANAGER_LINES, ON_LEAVE, PLANNED_ASSOCIATES, REGULARS, STORE } from "@/lib/challenge/day-three/workforce";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Onam Eve opens on a dark screen and a clock. The reveal is short — about
 * four seconds end to end — and a tap anywhere skips it, because the brief
 * was explicit: the first real decision within twenty or thirty seconds.
 */
export function DayThreeOpening({ onStart }: { onStart: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(reduced ? 5 : 0);

  React.useEffect(() => {
    if (reduced) return;
    const times = [500, 1300, 2200, 3100, 3900];
    const timers = times.map((ms, index) => window.setTimeout(() => setStep((s) => Math.max(s, index + 1)), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced]);

  const skip = () => setStep(5);
  const rise = (visible: boolean) => ({
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    transition: { duration: 0.5, ease: easing.outExpo },
  });

  return (
    // Tapping anywhere skips the reveal for a pointer; keyboard and screen
    // reader users get a real button below. The page itself is not a button.
    <div className="flex min-h-dvh flex-col bg-void" onClick={step < 5 ? skip : undefined}>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-12">
        <motion.p
          {...rise(true)}
          data-readout
          className="font-mono text-[clamp(2.6rem,9vw,4.6rem)] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
        >
          4:30 PM
        </motion.p>

        <motion.div {...rise(step >= 1)} className="mt-6">
          <p className="font-mono text-[11px] tracking-[0.3em] text-ember-500 uppercase">
            Day 3 · {STORE}
          </p>
          <h1 className="mt-2 text-[clamp(2.2rem,7vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-hi">
            Onam Eve
          </h1>
          <p className="mt-1 text-[clamp(1.1rem,3vw,1.4rem)] font-medium tracking-[-0.02em] text-mid">
            Build the shift
          </p>
        </motion.div>

        <motion.p {...rise(step >= 2)} className="mt-6 max-w-xl text-[16px] leading-relaxed text-mid">
          Tonight is forecast to be one of the busiest shifts of the month.
        </motion.p>

        <motion.div {...rise(step >= 3)} className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-3">
          <Figure label="Planned associates" value={String(PLANNED_ASSOCIATES)} />
          <Figure label="Available" value={String(REGULARS.length)} />
          <Figure
            label="Short"
            value={`${PLANNED_ASSOCIATES - REGULARS.length} people`}
            tone="alert"
          />
        </motion.div>

        <motion.ul {...rise(step >= 3)} className="mt-3 flex flex-wrap gap-1.5" aria-label="Out tonight">
          {ON_LEAVE.map((person) => (
            <li
              key={person.name}
              className="rounded-full border border-line-strong px-2.5 py-1 text-[11.5px] text-lo"
            >
              <span className="text-mid">{person.name}</span> · {person.reason}
            </li>
          ))}
        </motion.ul>

        <motion.div
          {...rise(step >= 4)}
          className="mt-8 rounded-card border border-ember-500/35 bg-ember-500/[0.05] p-4"
        >
          <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">
            Senior Store Manager · 4:30 PM
          </p>
          <div className="mt-2 space-y-1">
            {MANAGER_LINES.map((line) => (
              <p key={line} className="text-[16px] leading-relaxed text-hi">
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {step >= 5 ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easing.outExpo }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onStart} autoFocus>
                Build the shift
                <ArrowRight />
              </Button>
              <p className="text-[12px] leading-relaxed text-faint">
                Eighteen minutes on the clock, starting now. Nothing here is multiple choice.
              </p>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={skip}
              className="mt-8 self-start rounded px-1 text-[11.5px] text-faint hover:text-lo focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              Skip the introduction
            </button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "alert" }) {
  return (
    <div
      className={cn(
        "rounded-card border p-3 sm:p-4",
        tone === "alert" ? "border-alert-500/50 bg-alert-500/[0.07]" : "border-line-strong bg-surface",
      )}
    >
      <p className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase sm:text-[10px]">{label}</p>
      <p
        data-readout
        className={cn(
          "mt-2 text-[clamp(1.3rem,5vw,2.1rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums",
          tone === "alert" ? "text-alert-500" : "text-hi",
        )}
      >
        {value}
      </p>
    </div>
  );
}
