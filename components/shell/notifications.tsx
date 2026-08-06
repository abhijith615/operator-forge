"use client";

import { BellRing, Inbox } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FIRST_SHIFT } from "@/lib/constants/mission";

/**
 * Notification tray. Events are produced by the mission engine, so before the
 * shift starts this is genuinely empty — and says so.
 */
export function Notifications() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-lo transition-colors duration-150 hover:bg-white/[0.06] hover:text-hi"
              aria-label="Notifications"
            >
              <BellRing className="size-[17px]" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-84 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-medium text-hi">Notifications</span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            Standby
          </span>
        </div>
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
      </PopoverContent>
    </Popover>
  );
}
