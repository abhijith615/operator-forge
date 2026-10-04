"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  BAND_LABEL,
  type Band,
  type CapabilityReading,
  type GenomeMoment,
} from "@/types/genome";

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

/**
 * One side of the ledger.
 *
 * Both headings are always drawn, including when they are empty, because the
 * absence is itself the finding: an operator who reads "nothing here went
 * badly enough to cite" has learned something that a missing heading would
 * have hidden from them.
 */
function MomentGroup({
  label,
  tone,
  moments,
  empty,
  className,
}: {
  label: string;
  tone: "good" | "bad" | "neutral";
  moments: GenomeMoment[];
  empty?: string;
  className?: string;
}) {
  if (moments.length === 0 && !empty) return null;

  return (
    <div className={className}>
      <p
        className={cn(
          "font-mono text-[10px] tracking-[0.14em] uppercase",
          tone === "good" ? "text-ion-500" : tone === "bad" ? "text-alert-500" : "text-faint",
        )}
      >
        {label}
      </p>

      {moments.length === 0 ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-faint">{empty}</p>
      ) : (
        <ul className="mt-1.5 space-y-2">
          {moments.map((moment, momentIndex) => (
            <li key={momentIndex} className="flex gap-3">
              <span
                data-readout
                className="shrink-0 font-mono text-[10.5px] text-faint tabular-nums"
              >
                {hubClock(moment.at)}
              </span>
              <span className="text-[13px] leading-relaxed text-mid">{moment.text}</span>
            </li>
          ))}
        </ul>
      )}
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

                    <MomentGroup
                      label="What held"
                      tone="good"
                      moments={reading.moments.filter((m) => m.kind === "strength")}
                      empty="Nothing in this shift stood out as a strength here."
                    />

                    <MomentGroup
                      label="What cost you"
                      tone="bad"
                      moments={reading.moments.filter((m) => m.kind === "gap")}
                      empty="Nothing here went badly enough to cite."
                      className="mt-4"
                    />

                    {reading.moments.some((m) => m.kind === "note") ? (
                      <MomentGroup
                        label="Context"
                        tone="neutral"
                        moments={reading.moments.filter((m) => m.kind === "note")}
                        className="mt-4"
                      />
                    ) : null}

                    {/* The point of the whole panel: what to do about it. */}
                    <div className="mt-4 rounded-card border border-ember-500/25 bg-ember-500/[0.05] px-3.5 py-3">
                      <p className="font-mono text-[10px] tracking-[0.14em] text-ember-400 uppercase">
                        Next shift
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-mid">
                        {reading.advice}
                      </p>
                    </div>
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
