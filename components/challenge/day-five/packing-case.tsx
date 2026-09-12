"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShoppingBag, TriangleAlert } from "lucide-react";

import {
  CaseHeading,
  CustomerCard,
  InspectButton,
  OutcomeChip,
  SystemChip,
} from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { packingSeconds } from "@/lib/challenge/day-five/engine";
import { packingOutcome, packingSafety } from "@/lib/challenge/day-five/outcome";
import { PACKING } from "@/lib/challenge/day-five/scenario";
import type { BagId, Day5State, PackExtra, PackItemId } from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const BAGS: BagId[] = ["bag1", "bag2"];

const KIND_LABEL: Record<string, string> = {
  chemical: "Household chemical",
  openFood: "Open food",
  sealedFood: "Sealed food",
};

/**
 * The open delivery bag.
 *
 * A tote with an acidic cleaner lying against unwrapped coriander is inside
 * every rule the store has — the separators ran out, and CTD is four seconds
 * under target. Repacking costs eighteen of those seconds. That is the whole
 * decision, and the counter is deliberately visible while it is made.
 */
export function PackingCase({
  state,
  time,
  onMove,
  onToggleExtra,
  onInspect,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onMove: (item: PackItemId, bag: BagId) => void;
  onToggleExtra: (extra: PackExtra) => void;
  onInspect: (id: string) => void;
  onConfirm: (unsafe: boolean) => void;
}) {
  const packing = state.packing;
  const reduced = useReducedMotion();
  const [held, setHeld] = React.useState<PackItemId | null>(null);
  const safety = packingSafety(packing);
  const outcome = packingOutcome(packing);
  const added = packingSeconds(packing);
  const ctd = PACKING.ctd + added;
  const over = ctd > PACKING.target;
  const transitSeen = packing.inspected.includes("transit");

  const itemsIn = (bag: BagId) => PACKING.items.filter((item) => packing.bags[item.id] === bag);

  return (
    <section aria-label="The delivery bag" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow={`Case 3 · ${PACKING.station}`}
        title="180 seconds or zero contamination?"
        sub="Peak throughput, and the secondary separators ran out an hour ago."
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <SystemChip label="Order rate" value={PACKING.rate} />
        <SystemChip label="Separators" value={`${PACKING.separators} left`} tone="warn" />
        <span
          className={cn(
            "ml-auto inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1",
            over ? "border-warn-500/50 bg-warn-500/[0.08]" : "border-line-strong bg-surface",
          )}
        >
          <span className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">CTD</span>
          <motion.span
            key={ctd}
            initial={reduced ? false : { y: -4, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: easing.outExpo }}
            data-readout
            className={cn("font-mono text-[15px] leading-none font-semibold tabular-nums", over ? "text-warn-500" : "text-hi")}
          >
            {ctd}s
          </motion.span>
          <span className="font-mono text-[9.5px] text-faint">/ {PACKING.target}</span>
        </span>
      </div>

      {/* ── The packing surface ── */}
      <div className="grid gap-2 sm:grid-cols-2">
        {BAGS.map((bag) => {
          const here = itemsIn(bag);
          const hasChemical = here.some((item) => item.kind === "chemical");
          const hasOpenFood = here.some((item) => item.kind === "openFood");
          const mixed = hasChemical && hasOpenFood && !packing.extras.includes("liner");
          const isTarget = held !== null && packing.bags[held] !== bag;
          return (
            <div
              key={bag}
              onDragOver={(event) => {
                if (packing.confirmed) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain") as PackItemId;
                if (id) onMove(id, bag);
                setHeld(null);
              }}
              className={cn(
                "rounded-card border p-3 transition-colors",
                mixed ? "border-alert-500/50 bg-alert-500/[0.05]" : "border-line-strong bg-surface",
                isTarget && "outline-1 outline-ember-500/60 outline-dashed",
              )}
            >
              <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                <ShoppingBag className="size-3" aria-hidden />
                {PACKING.bags[bag]}
                {mixed ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-alert-500">
                    <TriangleAlert className="size-3" aria-hidden />
                    Mixed
                  </span>
                ) : null}
              </p>

              <ul className="mt-2.5 space-y-1.5">
                {here.length === 0 ? (
                  <li className="rounded border border-dashed border-line-strong px-2 py-6 text-center text-[10.5px] text-faint">
                    {held ? "Drop here" : "Empty"}
                  </li>
                ) : (
                  here.map((item) => (
                    <li key={item.id}>
                      <motion.button
                        type="button"
                        layout={!reduced}
                        draggable={!packing.confirmed}
                        onDragStart={(event) => {
                          (event as unknown as React.DragEvent).dataTransfer.setData("text/plain", item.id);
                          setHeld(item.id);
                        }}
                        onClick={() => setHeld(held === item.id ? null : item.id)}
                        aria-pressed={held === item.id}
                        className={cn(
                          "block w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                          held === item.id
                            ? "border-ember-500 bg-ember-500/15"
                            : item.kind === "chemical"
                              ? "border-alert-500/45 bg-alert-500/[0.06]"
                              : item.kind === "openFood"
                                ? "border-ion-500/40 bg-ion-500/[0.05]"
                                : "border-line bg-elevated",
                        )}
                      >
                        <span className="block text-[12px] font-semibold text-hi">{item.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                          <span className="font-mono text-[9.5px] text-faint">{item.detail}</span>
                          <span
                            className={cn(
                              "font-mono text-[9px] tracking-[0.1em] uppercase",
                              item.kind === "chemical" ? "text-alert-500" : item.kind === "openFood" ? "text-ion-400" : "text-faint",
                            )}
                          >
                            {KIND_LABEL[item.kind]}
                          </span>
                        </span>
                      </motion.button>
                    </li>
                  ))
                )}
              </ul>

              {held !== null && packing.bags[held] !== bag && !packing.confirmed ? (
                <button
                  type="button"
                  onClick={() => {
                    onMove(held, bag);
                    setHeld(null);
                  }}
                  className="mt-2 min-h-11 w-full rounded-md border border-ember-500/50 bg-ember-500/10 text-[11.5px] font-medium text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                >
                  Move here
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ── What else is on the bench ── */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(["liner", "extraBag"] as PackExtra[]).map((extra) => {
          const on = packing.extras.includes(extra);
          const spec = PACKING.extras[extra];
          return (
            <button
              key={extra}
              type="button"
              aria-pressed={on}
              disabled={packing.confirmed}
              onClick={() => onToggleExtra(extra)}
              className={cn(
                "min-h-11 rounded-card border px-3 py-2.5 text-left transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                on ? "border-ion-500/50 bg-ion-500/[0.06]" : "border-line bg-elevated hover:border-line-bright",
              )}
            >
              <span className="block text-[12.5px] font-semibold text-hi">{spec.label}</span>
              <span className="block text-[10.5px] text-lo">{spec.detail}</span>
              <span className="mt-1 block font-mono text-[9.5px] text-faint">
                +{spec.seconds}s · ₹{spec.cost}
              </span>
            </button>
          );
        })}
        <InspectButton
          label="Transit note"
          detail="How the bag travels"
          open={transitSeen}
          onOpen={() => onInspect("transit")}
        />
      </div>

      {transitSeen ? (
        <p className="rounded-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] leading-relaxed text-mid">
          {PACKING.transit}.
        </p>
      ) : null}

      {/* ── The customer's side of it ── */}
      <AnimatePresence initial={false}>
        {safety.openFoodWithChemical ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easing.outExpo }}
          >
            <CustomerCard eyebrow="Customer-side preview" tone="broken">
              <p className="text-[13.5px] leading-relaxed text-hi">
                The cleaner shifts upright against the coriander for fourteen minutes.
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                Leak, fumes and food contamination are all possible before the bag is opened.
              </p>
            </CustomerCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {packing.confirmed ? (
        <OutcomeChip state={outcome.use} headline={outcome.headline} detail={outcome.detail} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" onClick={() => onConfirm(!safety.safe)}>
          {safety.safe ? "Dispatch the order" : "Dispatch as packed"}
          <ArrowRight />
        </Button>
        <p className="text-[12px] text-lo">
          {added > 0 ? `Repack adds ${added} sec.` : "No time added yet."}
        </p>
      </div>
    </section>
  );
}
