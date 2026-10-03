"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ListChecks, MessagesSquare, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type TourPane = "queue" | "board" | "comms";

export interface TourStep {
  pane: TourPane;
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof ListChecks;
}

/**
 * The thirty seconds before the clock.
 *
 * A first-timer meets three dense panels and a countdown at the same moment,
 * and spends their first two minutes working out what they are looking at —
 * which is two minutes of a fifteen-minute assessment lost to the interface
 * rather than the job. The shift is hard on purpose; the furniture is not
 * supposed to be.
 *
 * Each step lifts one panel out of the dim and says what it is for. The real
 * control room is underneath the whole time, with real numbers on it, so by
 * the time the clock starts the operator has already read the board once.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    pane: "queue",
    eyebrow: "Left",
    title: "Everything the store needs from you",
    body: "Work arrives here while you are dealing with something else — three or four at a time, most of them on a clock. You choose what to open first, and that order is part of what is being read. Anything nobody gets to expires, and the store absorbs it.",
    icon: ListChecks,
  },
  {
    pane: "board",
    eyebrow: "Centre",
    title: "The floor, moving on its own",
    body: "These numbers drift between your decisions, not just because of them. Click-to-dispatch is the one the store is judged on: under 180 seconds. Everything else on this board either protects that number or costs it.",
    icon: Radio,
  },
  {
    pane: "comms",
    eyebrow: "Right",
    title: "Someone who has done this before",
    body: "The Senior Store Manager is on another site today and on the phone all shift. Ask anything — what a Nil Pick is, where the bottleneck is, what the SOP says. Asking costs you nothing. Guessing costs the store.",
    icon: MessagesSquare,
  },
];

export function PaneTour({
  step,
  total,
  onNext,
  onSkip,
}: {
  step: TourStep;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const reduced = useReducedMotion();
  const index = TOUR_STEPS.indexOf(step);
  const last = index === total - 1;
  const Icon = step.icon;

  // Enter and the arrow keys are what somebody reaches for in a full-screen
  // overlay; making them work costs nothing and saves a hunt for the button.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        onNext();
      }
      if (event.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onSkip]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step.pane}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: easing.outExpo }}
          className="w-full max-w-xl rounded-card border border-ember-500/30 bg-obsidian/95 p-5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-ember-500/15 text-ember-500">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.18em] text-ember-500 uppercase">
              {step.eyebrow}
            </span>
            <span className="ml-auto font-mono text-[11px] text-lo tabular-nums">
              {index + 1} / {total}
            </span>
          </div>

          <h2 id="tour-title" className="mt-3.5 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
            {step.title}
          </h2>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-mid">{step.body}</p>

          <div className="mt-5 flex items-center gap-2">
            <Button variant="primary" size="md" onClick={onNext} className="flex-1 sm:flex-none">
              {last ? "Start the shift" : "Next"}
              <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-0.5" />
            </Button>
            {last ? null : (
              <Button variant="ghost" size="md" onClick={onSkip}>
                Skip
              </Button>
            )}
            <span className="ml-auto hidden font-mono text-[10.5px] text-faint sm:inline">
              {last ? "The clock starts now" : "Clock is not running"}
            </span>
          </div>

          <div className="mt-4 flex gap-1.5" aria-hidden>
            {TOUR_STEPS.map((entry, i) => (
              <span
                key={entry.pane}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors",
                  i <= index ? "bg-ember-500" : "bg-line-strong",
                )}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
