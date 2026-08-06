"use client";

import { Gauge, PauseOctagon, Play } from "lucide-react";

import { Term } from "@/components/mission/term";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: null,
    label: "Normal",
    icon: Play,
    tip: "Take every order the zone sends you.",
  },
  {
    value: "throttled" as const,
    label: "Throttle",
    icon: Gauge,
    tip: "Cut intake by more than half so the floor can catch up. Costs revenue.",
  },
  {
    value: "closed" as const,
    label: "Close",
    icon: PauseOctagon,
    tip: "Stop new orders entirely. The backlog is all that is left to clear.",
  },
];

/**
 * The one lever that changes the shape of the whole shift. Deliberately sits in
 * the open — an operator should feel the weight of reaching for it.
 */
export function HubControls() {
  const override = useMissionStore((state) => state.world?.statusOverride ?? null);
  const dispatch = useMissionStore((state) => state.dispatch);

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-[12px] text-lo sm:inline">
        <Term id="throttle">Intake</Term>
      </span>
      <div className="flex items-center gap-0.5 rounded-full border border-line bg-white/[0.02] p-0.5">
        {OPTIONS.map((option) => {
          const active = override === option.value;
          return (
            <Tooltip key={option.label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "set-hub-status", status: option.value })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]",
                    "transition-colors duration-200",
                    active
                      ? option.value === null
                        ? "bg-ion-500/15 text-ion-400"
                        : option.value === "throttled"
                          ? "bg-warn-500/15 text-warn-500"
                          : "bg-alert-500/15 text-alert-500"
                      : "text-lo hover:bg-white/[0.05] hover:text-mid",
                  )}
                  aria-pressed={active}
                >
                  <option.icon className="size-3.5" />
                  {option.label}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 font-normal text-mid">
                {option.tip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
