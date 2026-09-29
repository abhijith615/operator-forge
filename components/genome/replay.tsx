"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";

import { MISSION_DURATION_SECONDS, hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";
import type { TimelineEntry, TimelineTone } from "@/types/mission-run";
import type { WorldTrace } from "@/types/telemetry";

const WIDTH = 900;
const HEIGHT = 150;
const PAD = 8;

const TONE_DOT: Record<TimelineTone, string> = {
  critical: "bg-alert-500",
  warning: "bg-warn-500",
  info: "bg-info-500",
  positive: "bg-ion-500",
  neutral: "bg-lo",
};

function pathFrom(
  traces: WorldTrace[],
  pick: (trace: WorldTrace) => number,
  min: number,
  max: number,
  duration: number,
): string {
  if (traces.length < 2) return "";
  const span = Math.max(0.0001, max - min);
  return traces
    .map((trace, index) => {
      const x = PAD + (trace.at / duration) * (WIDTH - PAD * 2);
      const y =
        HEIGHT - PAD - ((pick(trace) - min) / span) * (HEIGHT - PAD * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * The shift, replayable. Scrub or press play and the floor state and the record
 * move together — the point is to let an operator see the moment a decision
 * started costing them, rather than being told about it.
 */
export function Replay({
  fallbackTraces = [],
  fallbackTimeline = [],
}: {
  /** The stored run, used when this browser no longer holds the shift. */
  fallbackTraces?: WorldTrace[];
  fallbackTimeline?: TimelineEntry[];
}) {
  const liveTraces = useMissionStore((state) => state.traces);
  const liveTimeline = useMissionStore((state) => state.timeline);

  const traces = liveTraces.length > 0 ? liveTraces : fallbackTraces;
  const timeline = liveTimeline.length > 0 ? liveTimeline : fallbackTimeline;

  // The run's own length, not today's. A shift recorded when the mission was
  // thirty minutes long still has traces out at minute twenty-eight, and
  // scaling those against the current fifteen would draw most of the morning
  // off the right-hand edge of the chart.
  const duration = React.useMemo(
    () =>
      Math.max(
        MISSION_DURATION_SECONDS,
        ...traces.map((trace) => trace.at),
        ...timeline.map((entry) => entry.at),
      ),
    [traces, timeline],
  );
  /** Playback speed: the whole shift in about forty seconds. */
  const rate = duration / 40;

  const [at, setAt] = React.useState(duration);
  const [playing, setPlaying] = React.useState(false);

  // Parking the playhead at the end is only right for the run in hand; the
  // stored one arrives after the first render.
  React.useEffect(() => setAt(duration), [duration]);

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setAt((current) => {
        const next = current + rate / 4;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, rate, duration]);

  const ratings = traces.map((trace) => trace.rating);
  const minRating = Math.min(4.6, ...ratings) - 0.1;
  const maxRating = Math.max(4.6, ...ratings) + 0.1;

  const queues = traces.map((trace) => trace.openOrders);
  const maxQueue = Math.max(10, ...queues);

  const current =
    [...traces].reverse().find((trace) => trace.at <= at) ?? traces[0] ?? null;

  const nearby = React.useMemo(
    () =>
      timeline
        .filter((entry) => entry.at <= at && at - entry.at <= 90)
        .slice(0, 5),
    [timeline, at],
  );

  const playheadX = PAD + (at / duration) * (WIDTH - PAD * 2);

  if (traces.length < 2) {
    return (
      <div className="panel sheen p-6 text-[13.5px] text-lo">
        This shift was too short to replay.
      </div>
    );
  }

  return (
    <section className="panel sheen overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Replay
        </span>
        <span data-readout className="font-mono text-[13px] text-hi tabular-nums">
          {hubClock(Math.round(at))}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setAt(0);
              setPlaying(true);
            }}
            className="grid size-8 place-items-center rounded-full text-lo transition-colors hover:bg-white/[0.06] hover:text-hi"
            aria-label="Restart replay"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="grid size-8 place-items-center rounded-full bg-ember-500 text-white transition-transform hover:scale-105"
            aria-label={playing ? "Pause replay" : "Play replay"}
          >
            {playing ? (
              <Pause className="size-3.5" fill="currentColor" />
            ) : (
              <Play className="size-3.5 translate-x-px" fill="currentColor" />
            )}
          </button>
        </div>
      </header>

      <div className="px-5 pt-5">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-40 w-full"
          role="img"
          aria-label="Customer rating and open orders across the shift"
        >
          <defs>
            <linearGradient id="replay-rating" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5C400" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d={`${pathFrom(traces, (t) => t.rating, minRating, maxRating, duration)} L${WIDTH - PAD},${HEIGHT - PAD} L${PAD},${HEIGHT - PAD} Z`}
            fill="url(#replay-rating)"
          />
          <motion.path
            d={pathFrom(traces, (t) => t.rating, minRating, maxRating, duration)}
            fill="none"
            stroke="#F5C400"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: easing.outExpo }}
          />
          <motion.path
            d={pathFrom(traces, (t) => t.openOrders, 0, maxQueue, duration)}
            fill="none"
            stroke="#8B7CFF"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: easing.outExpo }}
          />

          <line
            x1={playheadX}
            y1={PAD}
            x2={playheadX}
            y2={HEIGHT - PAD}
            stroke="currentColor"
            className="text-hi/40"
            strokeWidth="1"
          />
          <circle cx={playheadX} cy={PAD} r="3" className="fill-hi" />
        </svg>

        <div className="mt-1 flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-ember-400">
            <span className="h-0.5 w-4 rounded-full bg-ember-500" />
            Customer rating
          </span>
          <span className="flex items-center gap-1.5 text-flux-400">
            <span className="h-0.5 w-4 rounded-full border-t border-dashed border-flux-400" />
            Open orders
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration}
          step={5}
          value={Math.round(at)}
          onChange={(event) => {
            setPlaying(false);
            setAt(Number(event.target.value));
          }}
          aria-label="Scrub through the shift"
          className={cn(
            "mt-4 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/[0.09]",
            "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ember-500",
            "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/[0.09]",
            "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ember-500",
          )}
        />
      </div>

      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-4">
        {[
          { label: "Rating", value: current ? current.rating.toFixed(2) : "—" },
          { label: "Open orders", value: current ? String(current.openOrders) : "—" },
          { label: "On the board", value: current ? String(current.pendingTasks) : "—" },
          { label: "Pickers active", value: current ? String(current.activeWorkers) : "—" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-5 py-3.5">
            <p className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
              {stat.label}
            </p>
            <p
              data-readout
              className="mt-1.5 text-[18px] leading-none font-semibold tracking-[-0.02em] text-hi tabular-nums"
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="min-h-[7rem] border-t border-line px-5 py-4">
        <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
          On the record here
        </p>
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {nearby.length === 0 ? (
              <motion.li
                key="quiet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] text-lo"
              >
                Nothing logged in this window.
              </motion.li>
            ) : (
              nearby.map((entry: TimelineEntry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: easing.outExpo }}
                  className="flex items-start gap-3"
                >
                  <span
                    data-readout
                    className="shrink-0 font-mono text-[10.5px] text-faint tabular-nums"
                  >
                    {hubClock(entry.at)}
                  </span>
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[entry.tone])}
                  />
                  <span className="text-[13px] leading-snug text-mid">{entry.title}</span>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
