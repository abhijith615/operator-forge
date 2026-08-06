"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";

import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";
import type { TimelineEntry, TimelineTone } from "@/types/mission-run";

const TONE_DOT: Record<TimelineTone, string> = {
  critical: "bg-alert-500",
  warning: "bg-warn-500",
  info: "bg-info-500",
  positive: "bg-ion-500",
  neutral: "bg-lo",
};

const TONE_TEXT: Record<TimelineTone, string> = {
  critical: "text-alert-500",
  warning: "text-warn-500",
  info: "text-info-500",
  positive: "text-ion-400",
  neutral: "text-mid",
};

type Filter = "all" | "event" | "action";

/**
 * The record of the morning, newest first. Events happened to the operator;
 * actions are what they did about them — the distinction is the whole point.
 */
export function Timeline({ className }: { className?: string }) {
  const timeline = useMissionStore((state) => state.timeline);
  const [filter, setFilter] = React.useState<Filter>("all");

  const entries = React.useMemo(() => {
    if (filter === "all") return timeline;
    return timeline.filter((entry) => entry.kind === filter);
  }, [timeline, filter]);

  const counts = React.useMemo(
    () => ({
      all: timeline.length,
      event: timeline.filter((entry) => entry.kind === "event").length,
      action: timeline.filter((entry) => entry.kind === "action").length,
    }),
    [timeline],
  );

  return (
    <section
      className={cn("panel sheen flex min-h-0 flex-col overflow-hidden", className)}
      aria-label="Live timeline"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <Activity className="size-3.5 text-ember-500" />
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Timeline
        </span>
        <div className="ml-auto flex items-center gap-0.5 rounded-full border border-line p-0.5">
          {(["all", "event", "action"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                "relative rounded-full px-2.5 py-1 text-[11px] capitalize transition-colors duration-150",
                filter === option ? "text-hi" : "text-lo hover:text-mid",
              )}
            >
              {filter === option ? (
                <motion.span
                  layoutId="timeline-filter"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  className="absolute inset-0 -z-10 rounded-full bg-white/[0.08]"
                />
              ) : null}
              {option === "all" ? "All" : option === "event" ? "Events" : "Yours"}
              <span className="ml-1 text-faint tabular-nums">{counts[option]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="mask-fade-y min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-lo">
            Nothing on the record yet.
          </p>
        ) : (
          <ol className="relative">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-[3.35rem] w-px bg-line"
            />
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <TimelineRow key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </section>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easing.outExpo }}
      className="relative grid grid-cols-[2.6rem_1.25rem_1fr] items-start gap-x-2 pb-4 last:pb-0"
    >
      <span
        data-readout
        className="pt-0.5 text-right font-mono text-[10.5px] text-faint tabular-nums"
      >
        {hubClock(entry.at)}
      </span>

      <span className="relative flex justify-center pt-1.5">
        <span
          className={cn(
            "size-[7px] rounded-full ring-4 ring-surface",
            TONE_DOT[entry.tone],
            entry.kind === "action" && "ring-2 ring-ember-500/40",
          )}
        />
      </span>

      <div className="min-w-0">
        <p
          className={cn(
            "text-[13px] leading-snug",
            entry.kind === "action" ? "text-hi" : TONE_TEXT[entry.tone],
          )}
        >
          {entry.title}
        </p>
        {entry.detail ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-lo">{entry.detail}</p>
        ) : null}
      </div>
    </motion.li>
  );
}
