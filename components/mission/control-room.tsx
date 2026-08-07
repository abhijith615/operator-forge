"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { AchievementStrip } from "@/components/mission/achievements";
import { AttentionList } from "@/components/mission/attention-list";
import { CommsRail } from "@/components/mission/comms-rail";
import { HubControls } from "@/components/mission/hub-controls";
import { TaskQueue } from "@/components/mission/task-queue";
import { Timeline } from "@/components/mission/timeline";
import { WorldStrip } from "@/components/mission/world-strip";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import { cn } from "@/lib/utils";

type Lane = "comms" | "floor" | "queue";

const LANES: { value: Lane; label: string }[] = [
  { value: "comms", label: "Comms" },
  { value: "floor", label: "Floor" },
  { value: "queue", label: "Queue" },
];

/**
 * The control room. Three columns, all live, nothing behind a navigation click:
 * communications on the left, the floor in the middle, the queue on the right.
 * Below `xl` the same three panels become lanes, because a supervisor on a
 * laptop still has to see all three.
 */
export function ControlRoom({
  firstName,
  chatConfigured,
}: {
  firstName: string;
  chatConfigured: boolean;
}) {
  const world = useMissionStore((state) => state.world);
  const pendingCount = useMissionStore(
    (state) => state.tasks.filter((task) => task.status === "pending").length,
  );
  const [lane, setLane] = React.useState<Lane>("queue");

  if (!world) return null;

  return (
    <div className="flex h-[calc(100dvh-var(--shell-topbar))] flex-col px-3 py-3 sm:px-4">
      {/* ── Lane switcher, small screens only ─────────────────────────── */}
      <div className="mb-2.5 flex shrink-0 gap-1 rounded-full border border-line p-0.5 xl:hidden">
        {LANES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLane(option.value)}
            className={cn(
              "relative flex-1 rounded-full py-1.5 text-[12.5px] transition-colors duration-150",
              lane === option.value ? "text-hi" : "text-lo hover:text-mid",
            )}
          >
            {lane === option.value ? (
              <motion.span
                layoutId="lane-active"
                transition={{ type: "spring", stiffness: 520, damping: 42 }}
                className="absolute inset-0 -z-10 rounded-full bg-white/[0.08]"
              />
            ) : null}
            {option.label}
            {option.value === "queue" && pendingCount > 0 ? (
              <span
                data-readout
                className="ml-1.5 font-mono text-[11px] text-ember-400 tabular-nums"
              >
                {pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[20rem_minmax(0,1fr)_23rem]">
        {/* ── Left: communications ────────────────────────────────────── */}
        <CommsRail
          configured={chatConfigured}
          className={cn("min-h-0", lane === "comms" ? "flex" : "hidden xl:flex")}
        />

        {/* ── Centre: the floor ───────────────────────────────────────── */}
        <div
          className={cn(
            "min-h-0 flex-col gap-3 overflow-y-auto",
            lane === "floor" ? "flex" : "hidden xl:flex",
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easing.outExpo }}
            className="shrink-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                data-readout
                className="text-[22px] leading-none font-semibold tracking-[-0.03em] text-hi tabular-nums"
              >
                {hubClock(world.elapsed)}
              </h2>
              <p className="text-[13px] text-mid">
                You have the floor, {firstName}.
              </p>
              <span className="ml-auto font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
                {FIRST_SHIFT.codename} · {FIRST_SHIFT.location}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <HubControls />
              <AchievementStrip />
            </div>
          </motion.div>

          <div className="shrink-0">
            <WorldStrip />
          </div>

          <AttentionList className="min-h-[16rem] flex-1" />
        </div>

        {/* ── Right: the queue ────────────────────────────────────────── */}
        <div
          className={cn(
            "min-h-0 flex-col gap-3",
            lane === "queue" ? "flex" : "hidden xl:flex",
          )}
        >
          <TaskQueue className="min-h-0 flex-1" />
          <Timeline className="h-[13rem] shrink-0" />
        </div>
      </div>
    </div>
  );
}
