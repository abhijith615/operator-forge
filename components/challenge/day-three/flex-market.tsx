"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Star } from "lucide-react";

import { Avatar, SkillLine } from "@/components/challenge/day-three/ui";
import { bestStation } from "@/lib/challenge/day-three/capacity";
import { flexCost } from "@/lib/challenge/day-three/engine";
import { EVENING_END } from "@/lib/challenge/day-three/forecast";
import { FLEX, FLEX_BUDGET, paidMinutes, windowCost } from "@/lib/challenge/day-three/workforce";
import {
  COVER_LABEL,
  type Day3State,
  type FlexWindow,
  type FlexWorker,
  type Station,
} from "@/lib/challenge/day-three/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

function hourLabel(t: number): string {
  const total = 16 * 60 + 30 + t;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}` : String(h12);
}

export function windowLabel(window: FlexWindow): string {
  return `${hourLabel(window.start)}–${hourLabel(window.end)} PM`;
}

/**
 * The flex picker market.
 *
 * A small on-demand labour marketplace, not a set of answer cards. Each person
 * has their own hours, pace and price; booking one puts a block on the board
 * straight away, and the budget moves with it. The cheapest person is not the
 * best one and the most expensive one is not either.
 */
export function FlexMarket({
  state,
  editable,
  lateId,
  onBook,
  onCancel,
}: {
  state: Day3State;
  editable: boolean;
  lateId: string | null;
  onBook: (flexId: string, windowId: string, station: Station) => void;
  onCancel: (flexId: string) => void;
}) {
  const spent = flexCost(state);

  return (
    <section aria-label="Flex picker market" className="space-y-3">
      <BudgetMeter spent={spent} />
      <ul className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
        {FLEX.map((worker) => (
          <li key={worker.id}>
            <FlexCard
              worker={worker}
              booking={state.flex[worker.id] ?? null}
              editable={editable}
              late={lateId === worker.id}
              onBook={(windowId, station) => onBook(worker.id, windowId, station)}
              onCancel={() => onCancel(worker.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BudgetMeter({ spent }: { spent: number }) {
  const reduced = useReducedMotion();
  const over = spent > FLEX_BUDGET;
  const share = Math.min(1, spent / FLEX_BUDGET);
  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-3.5",
        over ? "border-alert-500/50" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Temp staff budget</span>
        <span
          data-readout
          className={cn("text-[18px] font-semibold tabular-nums", over ? "text-alert-500" : "text-hi")}
        >
          {rupees(spent)}
          <span className="text-[12px] font-normal text-faint"> of {rupees(FLEX_BUDGET)}</span>
        </span>
        <span className={cn("ml-auto text-[11.5px]", over ? "text-alert-500" : "text-lo")}>
          {over ? `${rupees(spent - FLEX_BUDGET)} over` : `${rupees(FLEX_BUDGET - spent)} left`}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={cn("h-full rounded-full", over ? "bg-alert-500" : "bg-flux-400")}
          initial={false}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.5, ease: easing.outExpo }}
        />
      </div>
    </div>
  );
}

function Availability({ worker }: { worker: FlexWorker }) {
  const left = (worker.start / EVENING_END) * 100;
  const width = ((worker.end - worker.start) / EVENING_END) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-1.5 rounded-full bg-white/[0.06]" aria-hidden>
        <span
          className="absolute inset-y-0 rounded-full bg-flux-400/60"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <span
          className="absolute inset-y-[-2px] w-px bg-alert-500/70"
          style={{ left: `${(150 / EVENING_END) * 100}%` }}
        />
        <span
          className="absolute inset-y-[-2px] w-px bg-alert-500/70"
          style={{ left: `${(270 / EVENING_END) * 100}%` }}
        />
      </div>
      <p className="mt-1 flex justify-between font-mono text-[9px] text-faint">
        <span>4:30</span>
        <span className="text-mid">
          Available {hourLabel(worker.start)}–{hourLabel(worker.end)} PM
        </span>
        <span>10:00</span>
      </p>
    </div>
  );
}

function FlexCard({
  worker,
  booking,
  editable,
  late,
  onBook,
  onCancel,
}: {
  worker: FlexWorker;
  booking: { windowId: string; station: Station } | null;
  editable: boolean;
  late: boolean;
  onBook: (windowId: string, station: Station) => void;
  onCancel: () => void;
}) {
  const stations = (["picking", "packing"] as Station[]).filter((station) => worker.skills[station] > 0);
  const [station, setStation] = React.useState<Station>(booking?.station ?? bestStation(worker));
  const active = booking?.station ?? station;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-card border p-3.5 transition-colors",
        booking ? "border-flux-400/60 bg-flux-500/[0.06]" : "border-line bg-elevated",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar worker={worker} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14px] leading-tight font-semibold text-hi">
            {worker.name}
            {late ? (
              <span className="rounded-full border border-alert-500/50 px-1.5 py-px font-mono text-[9px] text-alert-500">
                LATE · 7:15
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11.5px] text-lo">{worker.experience}</p>
        </div>
        <div className="shrink-0 text-right">
          <p data-readout className="text-[15px] font-semibold text-hi tabular-nums">
            ₹{worker.rate}
            <span className="text-[10.5px] font-normal text-faint">/hr</span>
          </p>
          <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10.5px] text-lo">
            {worker.rating ? (
              <>
                <Star className="size-2.5 fill-ember-400 text-ember-400" aria-hidden />
                {worker.rating.toFixed(1)}
              </>
            ) : (
              "New"
            )}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <SkillLine worker={worker} />
        {worker.ppi ? (
          <span className="font-mono text-mid tabular-nums">PPI {worker.ppi.toFixed(1)}s</span>
        ) : null}
        {worker.newJoiner ? (
          <span className="inline-flex items-center gap-1 text-warn-500">
            <Clock className="size-2.5" aria-hidden />
            Ramps up in the first 30 min
          </span>
        ) : null}
      </div>

      <Availability worker={worker} />

      {stations.length > 1 ? (
        <div className="mt-3 grid grid-cols-2 gap-1" role="group" aria-label={`${worker.name}'s station`}>
          {stations.map((option) => (
            <button
              key={option}
              type="button"
              disabled={!editable}
              aria-pressed={active === option}
              onClick={() => {
                setStation(option);
                if (booking) onBook(booking.windowId, option);
              }}
              className={cn(
                "h-7 rounded-md border text-[11px] font-medium transition-colors disabled:opacity-50",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                active === option
                  ? "border-ember-500/70 bg-ember-500/15 text-hi"
                  : "border-line bg-surface text-lo hover:text-mid",
              )}
            >
              {COVER_LABEL[option]}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
          {COVER_LABEL[active]} only
        </p>
      )}

      {worker.prepaidUntil ? (
        <p className="mt-2 text-[11px] leading-relaxed text-flux-400">
          Already on the floor — her hours to {hourLabel(worker.prepaidUntil)} PM are booked and paid.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {worker.windows.map((window) => {
          const chosen = booking?.windowId === window.id;
          const paid = paidMinutes(worker, window);
          const hours = paid / 60;
          const base = paid === 0;
          return (
            <button
              key={window.id}
              type="button"
              disabled={!editable}
              aria-pressed={chosen}
              onClick={() => onBook(window.id, active)}
              className={cn(
                "flex min-h-9 flex-1 flex-col items-start justify-center rounded-md border px-2.5 py-1 text-left transition-colors disabled:opacity-50",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                chosen
                  ? "border-flux-400 bg-flux-500/20"
                  : "border-line-strong bg-surface hover:border-flux-400/60",
              )}
            >
              <span className="text-[12px] font-semibold text-hi">
                {base
                  ? chosen
                    ? `On shift · to ${hourLabel(window.end)} PM`
                    : "Her booking only"
                  : worker.prepaidUntil
                    ? `${chosen ? "Extended · " : "Extend "}to ${hourLabel(window.end)} PM`
                    : `${chosen ? "Booked · " : "Book "}${windowLabel(window)}`}
              </span>
              <span className="font-mono text-[10px] text-lo tabular-nums">
                {base ? "already paid" : `${hours} h · ${rupees(windowCost(worker, window))}`}
              </span>
            </button>
          );
        })}
      </div>

      {booking && paidMinutes(worker, worker.windows.find((w) => w.id === booking.windowId) ?? worker.windows[0]!) > 0 ? (
        <button
          type="button"
          disabled={!editable}
          onClick={onCancel}
          className="mt-2 self-start rounded px-1 text-[11.5px] text-lo underline-offset-4 hover:text-mid hover:underline focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        >
          {worker.prepaidUntil ? "Remove extension" : "Cancel booking"}
        </button>
      ) : null}
    </div>
  );
}
