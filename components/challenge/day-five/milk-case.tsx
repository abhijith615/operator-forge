"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Snowflake } from "lucide-react";

import {
  CaseHeading,
  CustomerCard,
  InspectButton,
  NodeMark,
  OutcomeChip,
  SystemChip,
} from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { milkOutcome } from "@/lib/challenge/day-five/outcome";
import { MILK } from "@/lib/challenge/day-five/scenario";
import {
  SHELF_SLOTS,
  type Day5State,
  type MilkBatchId,
  type ShelfSlot,
} from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The refrigerated shelf.
 *
 * One dominant object: two batches of the same milk, four places they can go.
 * The system says the 36-hour batch is sellable, which it is. What the system
 * does not say is how long a litre lasts in a house — and that only appears if
 * the operator opens it.
 */
export function MilkCase({
  state,
  time,
  onMove,
  onInspect,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onMove: (batch: MilkBatchId, slot: ShelfSlot) => void;
  onInspect: (id: "use" | "policy") => void;
  onConfirm: () => void;
}) {
  const milk = state.milk;
  const [held, setHeld] = React.useState<MilkBatchId | null>(null);
  const outcome = milkOutcome(milk);
  const touched = milk.placed.fresh36 !== "pickface" || milk.placed.fresh72 !== "back";

  const batchesIn = (slot: ShelfSlot) =>
    (Object.keys(milk.placed) as MilkBatchId[]).filter((id) => milk.placed[id] === slot);

  return (
    <section aria-label="The refrigerated shelf" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow="Case 1 · Chilled"
        title="Would you send this milk?"
        sub="Two batches of the same product. One of them is what tonight's orders will pick."
      />

      <div className="flex flex-wrap gap-1.5">
        <SystemChip label="System" value="Sellable" tone="ok" />
        <SystemChip label="Minimum life" value={`>${MILK.minimumSellableHours}h`} />
        <SystemChip label="Milk demand" value={MILK.demand} tone="warn" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ── The shelf ── */}
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
            <Snowflake className="size-3" aria-hidden />
            Chilled shelf · 4°C
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SHELF_SLOTS.map((slot) => {
              const here = batchesIn(slot);
              const isTarget = held !== null && milk.placed[held] !== slot;
              return (
                <div
                  key={slot}
                  onDragOver={(event) => {
                    if (milk.confirmed) return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain") as MilkBatchId;
                    if (id) onMove(id, slot);
                    setHeld(null);
                  }}
                  className={cn(
                    "rounded-card border p-2.5 transition-colors",
                    slot === "pickface"
                      ? "border-ember-500/40 bg-ember-500/[0.04]"
                      : "border-line-strong bg-elevated",
                    isTarget && "outline-1 outline-ember-500/60 outline-dashed",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-hi">{MILK.slots[slot].label}</span>
                    {slot === "pickface" ? (
                      <span className="font-mono text-[9px] tracking-[0.1em] text-ember-400 uppercase">Picks here</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-lo">{MILK.slots[slot].detail}</p>

                  <div className="mt-2 space-y-1.5">
                    {here.length === 0 ? (
                      <p className="rounded border border-dashed border-line-strong px-2 py-3 text-center text-[10.5px] text-faint">
                        {held ? "Drop here" : "Empty"}
                      </p>
                    ) : (
                      here.map((id) => (
                        <BatchCard
                          key={id}
                          id={id}
                          held={held === id}
                          editable={!milk.confirmed}
                          onHold={() => setHeld(held === id ? null : id)}
                        />
                      ))
                    )}
                  </div>

                  {/* Tap alternative to dragging, always available. */}
                  {held !== null && milk.placed[held] !== slot && !milk.confirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMove(held, slot);
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
        </div>

        {/* ── What the store knows, once asked ── */}
        <div className="space-y-2">
          <InspectButton
            label="Customer use signal"
            detail="How long a litre lasts"
            open={milk.useSignalSeen}
            onOpen={() => onInspect("use")}
            className="w-full"
          />
          <AnimatePresence initial={false}>
            {milk.useSignalSeen ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: easing.outExpo }}
              >
                <CustomerCard eyebrow="Customer use">
                  <p className="text-[13.5px] leading-relaxed text-hi">{MILK.household}</p>
                  <ol className="mt-3 space-y-1.5">
                    {MILK.useTimeline.map((row) => (
                      <li key={row.label} className="flex items-center gap-2">
                        <NodeMark state={row.state} />
                        <span className="text-[12px] text-mid">{row.label}</span>
                        <span
                          className={cn(
                            "ml-auto font-mono text-[10.5px]",
                            row.state === "broken" ? "text-alert-500" : row.state === "risk" ? "text-warn-500" : "text-faint",
                          )}
                        >
                          {row.note}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2.5 border-t border-white/10 pt-2.5 text-[11.5px] leading-relaxed text-mid">
                    A 36-hour bottle delivered tonight is gone by the second morning.
                  </p>
                </CustomerCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <InspectButton
            label="Stock policy"
            detail="What the rule actually says"
            open={milk.policySeen}
            onOpen={() => onInspect("policy")}
            className="w-full"
          />
          {milk.policySeen ? (
            <div className="rounded-card border border-line bg-surface p-3">
              <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Policy</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">
                Minimum sellable remaining life: <span className="text-hi">{MILK.minimumSellableHours} hours</span>.
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{MILK.policy}.</p>
            </div>
          ) : null}
        </div>
      </div>

      {touched ? <OutcomeChip state={outcome.use} headline={outcome.headline} detail={outcome.detail} /> : null}

      <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onConfirm}>
        Confirm the shelf
        <ArrowRight />
      </Button>
    </section>
  );
}

function BatchCard({
  id,
  held,
  editable,
  onHold,
}: {
  id: MilkBatchId;
  held: boolean;
  editable: boolean;
  onHold: () => void;
}) {
  const reduced = useReducedMotion();
  const batch = MILK.batches[id];
  const short = batch.hours < 48;
  return (
    <motion.button
      type="button"
      layout={!reduced}
      draggable={editable}
      onDragStart={(event) => {
        (event as unknown as React.DragEvent).dataTransfer.setData("text/plain", id);
        onHold();
      }}
      onClick={onHold}
      aria-pressed={held}
      className={cn(
        "block w-full rounded-md border px-2.5 py-2 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        held ? "border-ember-500 bg-ember-500/15" : short ? "border-warn-500/45 bg-warn-500/[0.06]" : "border-ion-500/45 bg-ion-500/[0.06]",
        editable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[12px] font-semibold text-hi">{batch.name}</span>
        <span
          data-readout
          className={cn("font-mono text-[15px] leading-none font-semibold tabular-nums", short ? "text-warn-500" : "text-ion-400")}
        >
          {batch.hours}h
        </span>
      </span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[9.5px] text-faint">
        <span>{batch.batch}</span>
        <span>In {batch.received}</span>
        <span>{batch.units} units</span>
      </span>
    </motion.button>
  );
}
