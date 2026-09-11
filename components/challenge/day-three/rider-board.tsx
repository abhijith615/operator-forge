"use client";

import * as React from "react";
import { AlertTriangle, Minus, Plus } from "lucide-react";

import { AnimatedNumber, AnimatedPercent, TONE_TEXT, coverTone } from "@/components/challenge/day-three/ui";
import { peakCoverage, riderHeadcount, type Series } from "@/lib/challenge/day-three/capacity";
import { riderCost } from "@/lib/challenge/day-three/engine";
import { PEAK_FROM, PEAK_TO, clockLabel, riderNeedAt } from "@/lib/challenge/day-three/forecast";
import { RIDER_SOURCES, SCHEDULED_RIDERS } from "@/lib/challenge/day-three/workforce";
import type { Day3State, RiderSource, RiderSourceId } from "@/lib/challenge/day-three/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { cn } from "@/lib/utils";

const NEED = Math.ceil(riderNeedAt(PEAK_FROM + 30, true));

/**
 * The rider sourcing board.
 *
 * A different shape of decision from the flex market on purpose: here the
 * operator is mixing sources with different arrival times, costs and human
 * costs, and watching the gap close as they do. Coverage is not the only
 * number on the board — the cost, the fatigue and the favour asked of another
 * store sit right beside it.
 */
export function RiderBoard({
  state,
  series,
  editable,
  onSet,
}: {
  state: Day3State;
  series: Series;
  editable: boolean;
  onSet: (source: RiderSourceId, count: number) => void;
}) {
  const atPeak = riderHeadcount(state, PEAK_FROM + 30).count;
  const gap = Math.max(0, NEED - atPeak);
  const coverage = peakCoverage(series).riders;

  // Where the gap reopens, if it does — Store 117's riders go home at 8:45.
  let low = { count: Infinity, at: PEAK_FROM };
  for (let t = PEAK_FROM; t < PEAK_TO; t += 5) {
    const count = riderHeadcount(state, t).count;
    if (count < low.count) low = { count, at: t };
  }
  const reopen = gap === 0 && low.count < NEED ? low : null;
  const morning = state.riders.morning;
  const fatigue = morning >= 3 ? "High" : morning >= 1 ? "Moderate" : "Low";

  return (
    <section aria-label="Rider sourcing board" className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Figure label="Expected need" value={String(NEED)} />
        <Figure label="Scheduled" value={String(SCHEDULED_RIDERS)} />
        <div
          className={cn(
            "rounded-card border p-3",
            gap > 0 ? "border-alert-500/50 bg-alert-500/[0.07]" : "border-ion-500/45 bg-ion-500/[0.06]",
          )}
        >
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Gap · 7:30 PM</p>
          <AnimatedNumber
            value={gap}
            format={(n) => (n === 0 ? "0" : `−${n}`)}
            className={cn(
              "mt-1.5 block text-[24px] leading-none font-semibold",
              gap > 0 ? "text-alert-500" : "text-ion-400",
            )}
          />
        </div>
      </div>

      {reopen ? (
        <p className="flex items-center gap-2 rounded-card border border-warn-500/40 bg-warn-500/[0.05] px-3 py-2 text-[12px] text-warn-500">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          The gap reopens at {clockLabel(reopen.at)} — {NEED - reopen.count} short once borrowed riders leave.
        </p>
      ) : null}

      <ul className="grid gap-2.5 md:grid-cols-3">
        {RIDER_SOURCES.map((source) => (
          <li key={source.id}>
            <SourceCard
              source={source}
              count={state.riders[source.id]}
              editable={editable}
              onSet={(count) => onSet(source.id, count)}
            />
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Summary label="Rider coverage · 7–9">
          <AnimatedPercent value={coverage} className={cn("text-[17px] font-semibold", TONE_TEXT[coverTone(coverage)])} />
        </Summary>
        <Summary label="Rider support cost">
          <span data-readout className="text-[17px] font-semibold text-hi tabular-nums">
            {rupees(riderCost(state))}
          </span>
        </Summary>
        <Summary label="Fatigue risk">
          <span
            className={cn(
              "text-[17px] font-semibold",
              fatigue === "High" ? "text-alert-500" : fatigue === "Moderate" ? "text-warn-500" : "text-ion-400",
            )}
          >
            {fatigue}
          </span>
        </Summary>
        <Summary label="Network support">
          <span data-readout className="text-[17px] font-semibold text-hi tabular-nums">
            {state.riders.nearby}
            <span className="text-[11px] font-normal text-faint"> of 6 from 117</span>
          </span>
        </Summary>
      </dl>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{label}</p>
      <p data-readout className="mt-1.5 text-[24px] leading-none font-semibold text-hi tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Summary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2.5">
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function SourceCard({
  source,
  count,
  editable,
  onSet,
}: {
  source: RiderSource;
  count: number;
  editable: boolean;
  onSet: (count: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-card border p-3.5",
        count > 0 ? "border-info-500/50 bg-info-500/[0.05]" : "border-line bg-elevated",
      )}
    >
      <p className="text-[14px] font-semibold text-hi">{source.name}</p>
      <p className="mt-0.5 text-[11.5px] text-lo">{source.detail}</p>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
        <dt className="text-faint">Up to</dt>
        <dd className="text-right font-mono text-mid tabular-nums">{source.max} riders</dd>
        <dt className="text-faint">Arrive</dt>
        <dd className="text-right font-mono text-mid tabular-nums">{clockLabel(source.arrive)}</dd>
        <dt className="text-faint">Until</dt>
        <dd className="text-right font-mono text-mid tabular-nums">{clockLabel(source.until)}</dd>
        <dt className="text-faint">Cost</dt>
        <dd className="text-right font-mono text-mid tabular-nums">₹{source.costPerRider} / rider</dd>
      </dl>
      {source.warning ? (
        <p className="mt-2 flex gap-1.5 text-[11.5px] leading-snug text-warn-500">
          <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
          {source.warning}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-3">
        <button
          type="button"
          disabled={!editable || count === 0}
          onClick={() => onSet(count - 1)}
          aria-label={`One fewer rider from ${source.name}`}
          className="grid size-9 place-items-center rounded-md border border-line-strong bg-surface text-mid transition-colors hover:text-hi disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <div className="flex-1 text-center">
          <span data-readout className="text-[20px] font-semibold text-hi tabular-nums">
            {count}
          </span>
          <span className="block font-mono text-[9.5px] text-faint">of {source.max}</span>
        </div>
        <button
          type="button"
          disabled={!editable || count >= source.max}
          onClick={() => onSet(count + 1)}
          aria-label={`One more rider from ${source.name}`}
          className="grid size-9 place-items-center rounded-md border border-line-strong bg-surface text-mid transition-colors hover:text-hi disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: source.max }, (_, index) => (
          <span
            key={index}
            className={cn("h-1 flex-1 rounded-full", index < count ? "bg-info-500" : "bg-white/[0.08]")}
          />
        ))}
      </div>
    </div>
  );
}
