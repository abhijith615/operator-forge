"use client";

import Link from "next/link";
import { BellRing, Inbox } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMissionHydrated } from "@/hooks/use-mission";
import { hubClock } from "@/lib/mission/config";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import type { TimelineTone } from "@/types/mission-run";

const DOT: Record<TimelineTone, string> = {
  critical: "bg-alert-500",
  warning: "bg-warn-500",
  info: "bg-info-500",
  positive: "bg-ion-500",
  neutral: "bg-lo",
};

/** The tray. Everything the floor has told the operator, newest first. */
export function Notifications() {
  const hydrated = useMissionHydrated();
  const timeline = useMissionStore((state) => state.timeline);
  const readAt = useMissionStore((state) => state.timelineReadAt);
  const markRead = useMissionStore((state) => state.markTimelineRead);

  const events = hydrated
    ? timeline.filter((entry) => entry.kind === "event").slice(0, 20)
    : [];
  const unread = events.filter((entry) => entry.at > readAt).length;

  return (
    <Popover onOpenChange={(open) => open && markRead()}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative grid size-8 place-items-center rounded-full text-lo transition-colors duration-150 hover:bg-white/[0.06] hover:text-hi"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <BellRing className="size-[17px]" />
              {unread > 0 ? (
                <span className="absolute top-1 right-1 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-ember-500" />
                  <span className="relative inline-flex size-2 rounded-full bg-ember-500 ring-2 ring-void" />
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-88 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-medium text-hi">Notifications</span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            {events.length ? `${events.length} today` : "Standby"}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="grid size-11 place-items-center rounded-full border border-line bg-white/[0.03]">
              <Inbox className="size-4.5 text-faint" />
            </div>
            <p className="text-[13.5px] text-hi">Nothing on the floor yet</p>
            <p className="max-w-[15rem] text-[12.5px] leading-relaxed text-lo">
              Absences, complaints, weather and escalations arrive here once{" "}
              {FIRST_SHIFT.name} begins.
            </p>
          </div>
        ) : (
          <ul className="mask-fade-y max-h-96 divide-y divide-line overflow-y-auto">
            {events.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={entry.source === "hub" ? "/mission" : `/${entry.source ?? "mission"}`}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT[entry.tone])}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-hi">{entry.title}</p>
                    {entry.detail ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-lo">
                        {entry.detail}
                      </p>
                    ) : null}
                  </div>
                  <span
                    data-readout
                    className="shrink-0 font-mono text-[10px] text-faint tabular-nums"
                  >
                    {hubClock(entry.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
