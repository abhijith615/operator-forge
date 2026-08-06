"use client";

import { Clock3 } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClock } from "@/hooks/use-clock";
import { FIRST_SHIFT } from "@/lib/constants/mission";
import { formatClock } from "@/lib/utils";

/**
 * Mission clock + wall clock.
 *
 * Phase 1 has no running mission, so the readout sits at standby and shows the
 * full duration. The mission engine drives it from Phase 2 onward.
 */
export function MissionStatus() {
  const now = useClock();

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-8 items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] pr-3 pl-2.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-warn-500" />
              <span className="relative inline-flex size-1.5 rounded-full bg-warn-500" />
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.14em] text-warn-500 uppercase">
              Standby
            </span>
            <span className="h-3 w-px bg-line-strong" />
            <span
              data-readout
              className="font-mono text-[12.5px] text-mid tabular-nums"
            >
              {FIRST_SHIFT.durationMinutes}:00
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Mission clock — starts when {FIRST_SHIFT.name} begins
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
        <TooltipContent>Hub local time</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Segmented progress across the shift. Empty until the mission starts. */
export function MissionProgress({ segments = 12 }: { segments?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="hidden items-center gap-[3px] xl:flex"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={FIRST_SHIFT.durationMinutes}
          aria-valuenow={0}
          aria-label="Mission progress"
        >
          {Array.from({ length: segments }, (_, index) => (
            <span
              key={index}
              className="h-3.5 w-[3px] rounded-full bg-white/[0.08]"
            />
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        0 of {FIRST_SHIFT.durationMinutes} minutes elapsed
      </TooltipContent>
    </Tooltip>
  );
}
