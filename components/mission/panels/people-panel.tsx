"use client";

import { motion } from "framer-motion";
import { Bike, Coffee, PhoneCall } from "lucide-react";

import {
  PanelFrame,
  StatRow,
  StatusPill,
} from "@/components/mission/panels/panel-frame";
import { Term } from "@/components/mission/term";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsShiftLive } from "@/hooks/use-mission";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn, formatDuration } from "@/lib/utils";
import type { Rider, Worker } from "@/types/world";

const WORKER_TONE = {
  active: "ion",
  absent: "alert",
  break: "warn",
  offline: "neutral",
} as const;

const RIDER_TONE = {
  idle: "neutral",
  delivering: "flux",
  returning: "ember",
  offline: "alert",
} as const;

export function PeoplePanel() {
  const world = useMissionStore((state) => state.world);
  const dispatch = useMissionStore((state) => state.dispatch);
  const live = useIsShiftLive();
  if (!world) return null;

  // Only pickers walk the aisles, so only pickers belong in the capacity read.
  const activePickers = world.workers.filter(
    (worker) => worker.role === "picker" && worker.status === "active",
  );
  const absent = world.workers.filter((worker) => worker.status === "absent");
  const ridersAvailable = world.riders.filter((rider) => rider.status === "idle");
  const ridersOffline = world.riders.filter((rider) => rider.status === "offline");

  return (
    <PanelFrame
      eyebrow="Who is on the floor"
      title="People"
      description={
        <>
          Pickers assemble the baskets, riders take them out. Every{" "}
          <Term id="picker">picker</Term> you lose lands on the queue within
          minutes, and every break you refuse lands on it later.
        </>
      }
    >
      <StatRow
        items={[
          { label: "Pickers active", value: String(activePickers.length) },
          { label: "Absent", value: String(absent.length) },
          { label: "Riders available", value: String(ridersAvailable.length) },
          { label: "Riders offline", value: String(ridersOffline.length) },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel sheen overflow-hidden">
          <header className="border-b border-line px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Floor staff
            </span>
          </header>
          <ul className="divide-y divide-line">
            {world.workers.map((worker) => (
              <WorkerRow
                key={worker.id}
                worker={worker}
                live={live}
                onRecall={() => dispatch({ type: "recall-worker", workerId: worker.id })}
                onBreak={() => dispatch({ type: "grant-break", workerId: worker.id })}
              />
            ))}
          </ul>
        </section>

        <section className="panel sheen overflow-hidden">
          <header className="border-b border-line px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Riders
            </span>
          </header>
          <ul className="divide-y divide-line">
            {world.riders.map((rider) => (
              <RiderRow key={rider.id} rider={rider} />
            ))}
          </ul>
        </section>
      </div>

      {world.impairments.filter((imp) => !imp.resolved).length > 0 ? (
        <section className="panel sheen mt-5 overflow-hidden">
          <header className="border-b border-line px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Equipment
            </span>
          </header>
          <ul className="divide-y divide-line">
            {world.impairments
              .filter((imp) => !imp.resolved)
              .map((impairment) => (
                <li
                  key={impairment.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-hi">{impairment.label}</p>
                    <p className="text-[11.5px] text-lo">
                      Pick throughput at {Math.round(impairment.pickPenalty * 100)}%
                      while this stands.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!live}
                    onClick={() =>
                      dispatch({ type: "clear-impairment", impairmentId: impairment.id })
                    }
                  >
                    Mark fixed
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </PanelFrame>
  );
}

function WorkerRow({
  worker,
  live,
  onRecall,
  onBreak,
}: {
  worker: Worker;
  live: boolean;
  onRecall: () => void;
  onBreak: () => void;
}) {
  const tired = worker.status === "active" && worker.fatigue > 0.75;

  return (
    <motion.li
      layout
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className="flex items-center gap-3 px-4 py-3.5"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-white/[0.035] text-[11px] font-medium text-mid">
        {worker.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-hi">{worker.name}</p>
        <p className="truncate text-[11.5px] text-lo">
          {/* Only the role is title-cased; a shift note is a sentence. */}
          <span className="capitalize">{worker.role}</span>
          {worker.shiftNote ? ` · ${worker.shiftNote}` : ""}
          {worker.status === "break" ? ` · back in ${formatDuration(worker.breakRemaining)}` : ""}
        </p>
      </div>

      {worker.status === "active" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden w-16 shrink-0 sm:block">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    tired ? "bg-alert-500" : worker.fatigue > 0.5 ? "bg-warn-500" : "bg-ion-500",
                  )}
                  style={{ width: `${Math.round(worker.fatigue * 100)}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Fatigue {Math.round(worker.fatigue * 100)}%
          </TooltipContent>
        </Tooltip>
      ) : null}

      <StatusPill tone={WORKER_TONE[worker.status]} className="capitalize">
        {worker.status}
      </StatusPill>

      <div className="flex w-[4.25rem] shrink-0 justify-end gap-1.5">
        {worker.status === "absent" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRecall}
                disabled={!live}
                aria-label={`Call in ${worker.name}`}
                className="hover:text-ion-400"
              >
                <PhoneCall />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Call them in</TooltipContent>
          </Tooltip>
        ) : null}

        {worker.status === "active" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onBreak}
                disabled={!live}
                aria-label={`Give ${worker.name} a break`}
                className={cn(tired ? "text-warn-500" : "hover:text-warn-500")}
              >
                <Coffee />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Five minutes off the floor</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </motion.li>
  );
}

function RiderRow({ rider }: { rider: Rider }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-white/[0.035] text-lo">
        <Bike className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-hi">{rider.name}</p>
        <p className="truncate text-[11.5px] text-lo">
          {rider.deliveriesCompleted} delivered
          {rider.status === "returning"
            ? ` · back in ${formatDuration(rider.returnRemaining)}`
            : ""}
        </p>
      </div>

      <StatusPill tone={RIDER_TONE[rider.status]} className="capitalize">
        {rider.status}
      </StatusPill>
    </li>
  );
}
