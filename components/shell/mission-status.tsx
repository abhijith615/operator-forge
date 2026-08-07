"use client";

import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClock } from "@/hooks/use-clock";
import {
  useLiveElapsed,
  useMissionHydrated,
  useMissionProgress,
  useMissionRemaining,
} from "@/hooks/use-mission";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import { hubClock } from "@/lib/mission/config";
import { useMissionStore } from "@/stores/mission-store";
import { cn, formatClock, formatDuration } from "@/lib/utils";

/**
 * Mission clock and wall clock. The mission clock derives from the run's start
 * timestamp, so a refresh, a background tab or a closed laptop all resolve to
 * the same truth: the shift kept going.
 */
export function MissionStatus() {
  const now = useClock();
  const hydrated = useMissionHydrated();
  const status = useMissionStore((state) => state.status);
  const elapsed = useLiveElapsed();
  const remaining = useMissionRemaining();

  const live = hydrated && status === "live";
  const done = hydrated && status === "complete";

  // Under five minutes the readout stops being neutral.
  const urgent = live && remaining <= 300;

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-full border pr-3 pl-2.5 transition-colors duration-500",
              urgent
                ? "border-alert-500/40 bg-alert-500/[0.08]"
                : "border-line-strong bg-white/[0.03]",
            )}
          >
            <span className="relative flex size-1.5">
              <span
                className={cn(
                  "absolute inline-flex size-full rounded-full",
                  live ? "animate-ping-slow" : "",
                  live ? (urgent ? "bg-alert-500" : "bg-ion-500") : "bg-warn-500",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex size-1.5 rounded-full",
                  live ? (urgent ? "bg-alert-500" : "bg-ion-500") : "bg-warn-500",
                )}
              />
            </span>

            <span
              className={cn(
                "font-mono text-[10.5px] tracking-[0.14em] uppercase",
                live ? (urgent ? "text-alert-500" : "text-ion-400") : "text-warn-500",
              )}
            >
              {live ? "Live" : done ? "Ended" : "Standby"}
            </span>

            <span className="h-3 w-px bg-line-strong" />

            <span
              data-readout
              className={cn(
                "font-mono text-[12.5px] tabular-nums",
                urgent ? "text-alert-500" : "text-mid",
              )}
              suppressHydrationWarning
            >
              {live
                ? `T−${formatDuration(remaining)}`
                : done
                  ? hubClock(elapsed)
                  : `${FIRST_SHIFT.durationMinutes}:00`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {live
            ? `Hub time ${hubClock(elapsed)} · ${formatDuration(remaining)} left`
            : done
              ? "The shift has ended"
              : `Mission clock — starts when ${FIRST_SHIFT.name} begins`}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden h-8 items-center gap-2 rounded-full px-2.5 text-lo sm:flex">
            <Clock3 className="size-3.5" />
            <span
              data-readout
              className="font-mono text-[12.5px] tabular-nums"
              suppressHydrationWarning
            >
              {now ? formatClock(now) : "--:--"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Your local time</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Segmented progress across the shift. One segment per five minutes. */
export function MissionProgress({ segments = 12 }: { segments?: number }) {
  const hydrated = useMissionHydrated();
  const progress = useMissionProgress();
  const elapsed = useMissionStore((state) => state.world?.elapsed ?? 0);
  const filled = hydrated ? progress * segments : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="hidden items-center gap-[3px] xl:flex"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={FIRST_SHIFT.durationMinutes}
          aria-valuenow={Math.floor(elapsed / 60)}
          aria-label="Mission progress"
        >
          {Array.from({ length: segments }, (_, index) => {
            const fill = Math.max(0, Math.min(1, filled - index));
            return (
              <span
                key={index}
                className="relative h-3.5 w-[3px] overflow-hidden rounded-full bg-white/[0.08]"
              >
                <motion.span
                  initial={false}
                  animate={{ scaleY: fill }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 origin-bottom rounded-full bg-ember-500"
                />
              </span>
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {Math.floor(elapsed / 60)} of {FIRST_SHIFT.durationMinutes} minutes elapsed
      </TooltipContent>
    </Tooltip>
  );
}
