"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BAND_LABEL, type Band, type CapabilityReading } from "@/types/genome";

/** Five marks along a rail, no numbers. The rail is the same for every axis. */
const BAND_INDEX: Record<Band, number> = {
  emerging: 0,
  developing: 1,
  solid: 2,
  strong: 3,
  distinctive: 4,
};

function BandRail({ band }: { band: Band }) {
  const index = BAND_INDEX[band];
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((step) => (
        <motion.span
          key={step}
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: step * 0.05, ease: easing.outExpo }}
          className={cn(
            "h-1 w-4 rounded-full",
            step <= index ? "bg-ember-500" : "bg-white/[0.09]",
          )}
        />
      ))}
    </div>
  );
}

export function CapabilityPanel({ readings }: { readings: CapabilityReading[] }) {
  const [open, setOpen] = React.useState<string | null>(readings[0]?.id ?? null);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
      {readings.map((reading, index) => {
        const isOpen = open === reading.id;
        return (
          <li key={reading.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : reading.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.02]"
              aria-expanded={isOpen}
            >
              <span className="w-6 shrink-0 font-mono text-[10.5px] text-faint tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-hi">
                  {reading.name}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-lo">
                  {reading.headline}
                </span>
              </span>

              <span className="hidden shrink-0 items-center gap-3 sm:flex">
                <BandRail band={reading.band} />
                <span className="w-20 text-right text-[12px] text-mid">
                  {BAND_LABEL[reading.band]}
                </span>
              </span>

              {reading.confidence === "low" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 text-faint">
                      <Info className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 font-normal text-mid">
                    One shift gave us little evidence here. Treat this reading as
                    provisional.
                  </TooltipContent>
                </Tooltip>
              ) : null}

              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-faint transition-transform duration-200",
                  isOpen && "rotate-90",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: easing.outExpo }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-line bg-obsidian/40 px-5 py-4 pl-[3.75rem]">
                    <div className="mb-3 flex items-center gap-3 sm:hidden">
                      <BandRail band={reading.band} />
                      <span className="text-[12px] text-mid">
                        {BAND_LABEL[reading.band]}
                      </span>
                    </div>

                    {reading.moments.length === 0 ? (
                      <p className="text-[13px] leading-relaxed text-lo">
                        Nothing in this shift spoke to this one clearly. It is not a
                        weakness — it simply did not come up.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {reading.moments.map((moment, momentIndex) => (
                          <li key={momentIndex} className="flex gap-3">
                            <span
                              data-readout
                              className="shrink-0 font-mono text-[10.5px] text-faint tabular-nums"
                            >
                              {hubClock(moment.at)}
                            </span>
                            <span className="text-[13px] leading-relaxed text-mid">
                              {moment.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
