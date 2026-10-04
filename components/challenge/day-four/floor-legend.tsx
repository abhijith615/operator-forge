"use client";

import { BATCHES } from "@/lib/challenge/day-four/scenario";
import type { BatchId, Day4State } from "@/lib/challenge/day-four/types";
import { cn } from "@/lib/utils";

/**
 * What the floor is drawn in.
 *
 * Every square in GRN staging is coloured by which load it came off, every
 * putaway circle is a team, and an amber outline means a carton the system has
 * not accepted yet. None of that was written down anywhere, so the diagram had
 * to be decoded before it could be read — and the one number that decides the
 * day, how much of staging is full, was a colour you had to count.
 *
 * Only loads that have actually reached the floor are listed. A key to eight
 * batches when three are on the floor is a key to five things that are not
 * there.
 */

const BATCH_SWATCH: Record<BatchId, string> = {
  S1: "bg-ion-500/60",
  S2: "bg-white/[0.14]",
  C1: "bg-warn-500/70",
  D1: "bg-info-500/80",
  F1: "bg-flux-400/75",
  G1: "bg-ion-400/85",
  G2: "bg-white/30",
  G3: "bg-white/[0.18]",
};

export function FloorLegend({ state }: { state: Day4State }) {
  const onFloor = (Object.keys(BATCHES) as BatchId[]).filter((id) => {
    // On the floor means off the vehicle and not yet shelved — exactly the
    // cartons the staging grid is drawing.
    const stage = state.batches[id].stage;
    return stage !== "vehicle" && stage !== "qc" && stage !== "ready";
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-3 py-2.5">
      <span className="font-mono text-[9.5px] tracking-[0.16em] text-faint uppercase">Key</span>

      {onFloor.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-mid">
          <span className={cn("size-2.5 shrink-0 rounded-[2px]", BATCH_SWATCH[id])} aria-hidden />
          {BATCHES[id].name}
        </span>
      ))}

      <span className="inline-flex items-center gap-1.5 text-[11px] text-mid">
        <span
          className="size-2.5 shrink-0 rounded-[2px] border border-warn-500 bg-transparent"
          aria-hidden
        />
        Not scan-verified
      </span>

      <span className="inline-flex items-center gap-1.5 text-[11px] text-mid">
        <span className="size-2.5 shrink-0 rounded-full bg-ion-400" aria-hidden />
        Team on putaway
      </span>

      <span className="inline-flex items-center gap-1.5 text-[11px] text-mid">
        <span className="size-2.5 shrink-0 rounded-full border border-white/30 bg-white/10" aria-hidden />
        Team on a dock
      </span>
    </div>
  );
}
