"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";

import { Avatar, Shift, TONE_TEXT, coverTone } from "@/components/challenge/day-three/ui";
import { Button } from "@/components/ui/button";
import {
  evaluate,
  faisalPpi,
  peakCoverage,
  type World,
} from "@/lib/challenge/day-three/capacity";
import { FAISAL, REGULARS } from "@/lib/challenge/day-three/workforce";
import type { Day3State, FaisalAction } from "@/lib/challenge/day-three/types";
import { cn } from "@/lib/utils";

const ACTIONS: { id: FaisalAction; label: string; detail: string }[] = [
  { id: "pair", label: "Pair with an expert", detail: "Half an hour beside a pro picker, 6:30–7:00" },
  { id: "zone", label: "Move to a simpler zone", detail: "Festival essentials · fast-moving SKUs" },
  { id: "coach", label: "Schedule coaching after peak", detail: "Tomorrow, with the floor lead" },
  { id: "keep", label: "Keep current role", detail: "No change tonight" },
  { id: "packing", label: "Move to packing", detail: "Not trained on packing" },
  { id: "remove", label: "Remove from shift", detail: "Send him home for the evening" },
];

const IMPLICATION: Record<FaisalAction, string> = {
  pair: "Pairing costs the expert a quarter of their pace from 6:30 to 7:00, and buys a faster Faisal for the rest of the peak.",
  zone: "The simpler zone shortens his walk and keeps his accuracy. No capacity cost.",
  coach: "Coaching after the peak costs nothing tonight and puts a plan behind the trend.",
  keep: "No change. Under peak pressure his pace is projected to slip further.",
  packing: "Faisal isn't trained on packing: expect a fraction of a trained packer's pace, and errors.",
  remove: "Picking loses all of Faisal's capacity from 6:25. His accuracy was never the problem.",
};

/**
 * Faisal's performance review.
 *
 * Not a question — his card, opened, with what a manager can actually do. The
 * projection is the consequence of what is selected, so the operator sees the
 * trade before committing to it. A slow worker is not automatically a bad
 * one, and nothing here says which answer that implies.
 */
export function FaisalReview({
  state,
  world,
  time,
  onToggle,
  onApply,
}: {
  state: Day3State;
  world: World;
  time: string;
  onToggle: (action: FaisalAction) => void;
  onApply: () => void;
}) {
  const faisal = REGULARS.find((worker) => worker.id === FAISAL.id)!;
  const base: Day3State = { ...state, faisal: [] };
  const off = state.faisal.includes("remove") || state.faisal.includes("packing");
  const ppiBase = faisalPpi(base, world, 180);
  const ppiNow = faisalPpi(state, world, 180);
  const pickBase = peakCoverage(evaluate(base, world)).picking;
  const pickNow = peakCoverage(evaluate(state, world)).picking;

  return (
    <section aria-label="Faisal's performance" className="space-y-3">
      <div className="rounded-card border border-warn-500/40 bg-warn-500/[0.04] p-4">
        <p className="font-mono text-[10px] tracking-[0.18em] text-warn-500 uppercase">
          {time} · Picker performance alert
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-3">
            <Avatar worker={faisal} size="lg" />
            <div>
              <p className="text-[17px] font-semibold text-hi">{faisal.name}</p>
              <p className="text-[12px] text-mid">
                {faisal.level} · {faisal.tenure}
              </p>
            </div>
          </div>
          <dl className="ml-auto grid grid-cols-3 gap-2 text-right">
            <div>
              <dt className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Today&apos;s PPI</dt>
              <dd data-readout className="text-[20px] font-semibold text-alert-500 tabular-nums">
                {FAISAL.today}s
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Benchmark</dt>
              <dd data-readout className="text-[20px] font-semibold text-hi tabular-nums">
                {FAISAL.benchmark.replace(" sec", "")}s
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Accuracy</dt>
              <dd data-readout className="text-[20px] font-semibold text-ion-400 tabular-nums">
                {faisal.accuracy}%
              </dd>
            </div>
          </dl>
        </div>
        <Trend />
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2" role="group" aria-label="Interventions for Faisal">
        {ACTIONS.map((action) => {
          const on = state.faisal.includes(action.id);
          return (
            <button
              key={action.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(action.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-card border p-3 text-left transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                on ? "border-ember-500/70 bg-ember-500/[0.08]" : "border-line bg-elevated hover:border-line-bright",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                  on ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong",
                )}
                aria-hidden
              >
                {on ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-hi">{action.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-[11.5px]",
                    action.id === "packing" ? "text-warn-500" : "text-lo",
                  )}
                >
                  {action.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Projected, 7–9 PM</p>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11.5px] text-lo">Faisal&apos;s pace at peak</p>
            <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums">
              <span className={ppiBase > 15 ? "text-alert-500" : "text-ion-400"}>{ppiBase.toFixed(1)}s</span>
              <span className="text-faint"> → </span>
              {off ? (
                <span className="text-faint">off picking</span>
              ) : (
                <span className={ppiNow > 18 ? "text-alert-500" : ppiNow > 15 ? "text-warn-500" : "text-ion-400"}>
                  {ppiNow.toFixed(1)}s
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11.5px] text-lo">Picking coverage</p>
            <Shift from={pickBase} to={pickNow} className="mt-1 text-[16px]" />
          </div>
        </div>
        {state.faisal.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-line pt-3">
            {state.faisal.map((action) => (
              <li key={action} className="text-[12px] leading-relaxed text-mid">
                {IMPLICATION[action]}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn("mt-3 border-t border-line pt-3 text-[12px]", TONE_TEXT[coverTone(pickNow)])}>
            Choose what happens to Faisal. Some of these combine.
          </p>
        )}
      </div>

      <Button variant="primary" size="lg" className="w-full" disabled={state.faisal.length === 0} onClick={onApply}>
        Apply to Faisal
        <ArrowRight />
      </Button>
    </section>
  );
}

/** Seven days of PPI against the store's working range. */
function Trend() {
  const values = FAISAL.trend;
  const W = 280;
  const H = 70;
  const min = 9;
  const max = 24;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const x = (i: number) => (i / (values.length - 1)) * (W - 16) + 8;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[70px] w-full" role="img" aria-label={`PPI over seven days: ${values.join(", ")} seconds`}>
        <rect x={0} y={y(15)} width={W} height={y(10) - y(15)} className="fill-ion-500/10" />
        <line x1={0} x2={W} y1={y(15)} y2={y(15)} className="stroke-ion-500/40" strokeDasharray="3 3" />
        <polyline points={points} fill="none" className="stroke-warn-500" strokeWidth={1.6} />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === values.length - 1 ? 3.2 : 2}
            className={i === values.length - 1 ? "fill-alert-500" : "fill-warn-500"}
          />
        ))}
      </svg>
      <figcaption className="flex justify-between font-mono text-[9.5px] text-faint tabular-nums">
        {values.map((v, i) => (
          <span key={i} className={i === values.length - 1 ? "text-alert-500" : undefined}>
            {v}
          </span>
        ))}
      </figcaption>
      <p className="mt-1 text-[11px] text-faint">7-day PPI · shaded band is the store&apos;s 10–15 sec working range</p>
    </figure>
  );
}
