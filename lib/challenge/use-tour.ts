"use client";

import * as React from "react";

import type { TourStep } from "@/components/challenge/pane-tour";

/**
 * The introduction every day gets before its clock starts.
 *
 * Day 1 proved the shape: a first-timer meeting three dense surfaces and a
 * countdown at the same moment spends their first two minutes working out
 * what they are looking at, and those two minutes come out of the assessment
 * rather than out of the interface. Each day has its own surfaces, so each day
 * writes its own steps — what they share is this: the real boards are
 * underneath, holding real numbers, and not a second is spent until the last
 * step is closed.
 *
 * `spotlight(key)` is the whole integration. A day tags each surface with it
 * and gets a ring on the one being described and a dim on everything else.
 */
export function useTour(steps: readonly TourStep[]) {
  const [at, setAt] = React.useState(0);
  const step = steps[at] ?? null;

  const next = React.useCallback(() => setAt((value) => value + 1), []);
  const skip = React.useCallback(() => setAt(steps.length), [steps.length]);

  /** Lifts the surface this step is about, and sinks the rest. */
  const spotlight = React.useCallback(
    (key: string): string => {
      if (!step) return "";
      return step.pane === key
        ? "relative z-30 rounded-card ring-2 ring-ember-500/60 ring-offset-2 ring-offset-void/40"
        : "opacity-35 blur-[1px] saturate-50";
    },
    [step],
  );

  return { step, index: at, total: steps.length, running: step !== null, next, skip, spotlight };
}
