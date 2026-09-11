"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, X } from "lucide-react";

import {
  MicroLine,
  StageHeading,
  TickCounter,
  VarianceBadge,
} from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/challenge/day-two/ledger";
import {
  AFFECTED_PICKS,
  FLOW_NODES,
  FLOW_SLOTS,
  NET_VALUE_IMPACT,
  PRE_DRIFT,
  RECORD_UNITS_AFFECTED,
  SKU_30,
  SKU_40,
  VALUE_GAP_PER_PICK,
  varianceOf,
  type FlowSlot,
} from "@/lib/challenge/day-two/parleg/content";
import type { FlowNodeId, FlowSlotId, ParleGState } from "@/lib/challenge/day-two/parleg/types";
import { cn } from "@/lib/utils";

/**
 * Stage 3 — solve the drift.
 *
 * The four facts the learner has found are pieces; the diagram is the claim
 * they make together. Tap a piece and then a place (or drag it, on a desktop).
 * The board is only judged when it is full, and a board that does not hold
 * hands its wrong pieces back without the word "incorrect".
 *
 * Once it holds, the consequences run: seventeen deductions on the 30 g record
 * with nothing leaving its shelf, seventeen packs leaving the 40 g shelf with
 * nothing leaving its record. That is the moment the case exists for.
 */
export function InventoryFlowBoard({
  state,
  onPlace,
  onClear,
  onContinue,
}: {
  state: ParleGState;
  onPlace: (node: FlowNodeId, slot: FlowSlotId) => void;
  onClear: (slot: FlowSlotId) => void;
  onContinue: () => void;
}) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = React.useState<FlowNodeId | null>(null);
  const [drift, setDrift] = React.useState(0);

  const placed = new Set(Object.values(state.placements).filter(Boolean));
  const tray = FLOW_NODES.filter((node) => !placed.has(node.id));
  const slot = (id: FlowSlotId) => FLOW_SLOTS.find((s) => s.id === id)!;
  const solved = state.flowSolved;

  function place(target: FlowSlotId) {
    if (!selected) return;
    onPlace(selected, target);
    setSelected(null);
  }

  const slotProps = {
    state,
    selected,
    onPlace: place,
    onDropNode: (node: FlowNodeId, target: FlowSlotId) => onPlace(node, target),
    onClear,
  };

  return (
    <div className="space-y-5">
      <StageHeading
        eyebrow="Stage 3 · Solve the drift"
        title="Put the drift together."
        sub="Four facts, one process. Place each where it belongs."
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Tray */}
        <div className="space-y-2 lg:pt-1">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
            {solved ? "Every piece placed" : "Findings"}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {tray.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", node.id)}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  aria-pressed={selected === node.id}
                  className={cn(
                    "w-full cursor-grab rounded-card border px-3.5 py-3 text-left text-[13px] leading-snug font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    selected === node.id
                      ? "border-ember-500/70 bg-ember-500/[0.1] text-hi"
                      : "border-line-strong bg-elevated text-hi hover:border-ember-500/40",
                  )}
                >
                  {node.label}
                </button>
              </li>
            ))}
          </ul>
          {state.rejectedSlots.length > 0 ? (
            <MicroLine tone="mid">The drift doesn&apos;t reconcile from this flow yet.</MicroLine>
          ) : null}
        </div>

        {/* Diagram */}
        <motion.div
          key={state.flowAttempts}
          animate={state.rejectedSlots.length > 0 && !reduced ? { x: [0, -4, 4, -2, 0] } : undefined}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="mx-auto max-w-sm">
            <Slot slot={slot("control")} {...slotProps} />
          </div>
          <Connector solved={solved} />
          <div className="mx-auto max-w-sm">
            <Slot slot={slot("event")} {...slotProps} />
          </div>
          <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
            <path
              d="M50 0 L25 24 M50 0 L75 24"
              fill="none"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              className={solved ? "stroke-ion-400" : "stroke-line-bright"}
            />
          </svg>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <Slot slot={slot("sku30Effect")} {...slotProps} />
            <Slot slot={slot("sku40Effect")} {...slotProps} />
          </div>
        </motion.div>
      </div>

      {solved ? (
        <div className="space-y-4 border-t border-line pt-5">
          <MicroLine>Drift explained.</MicroLine>
          <div className="grid gap-3 sm:grid-cols-2">
            <DriftLedger
              name={SKU_30.name}
              perPick="Each wrong pick · system −1 · shelf 0"
              system={{ from: PRE_DRIFT.sku30, to: SKU_30.system }}
              physical={{ from: SKU_30.physical, to: SKU_30.physical }}
              variance={varianceOf(SKU_30)}
              onDone={() => setDrift((n) => n + 1)}
            />
            <DriftLedger
              name={SKU_40.name}
              perPick="Each wrong pick · system 0 · shelf −1"
              system={{ from: SKU_40.system, to: SKU_40.system }}
              physical={{ from: PRE_DRIFT.sku40, to: SKU_40.physical }}
              variance={varianceOf(SKU_40)}
              onDone={() => setDrift((n) => n + 1)}
            />
          </div>

          {drift >= 2 ? <RootCause onContinue={onContinue} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Connector({ solved }: { solved: boolean }) {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className={cn("size-5", solved ? "text-ion-400" : "text-line-bright")} aria-hidden />
    </div>
  );
}

function Slot({
  slot,
  state,
  selected,
  onPlace,
  onDropNode,
  onClear,
}: {
  slot: FlowSlot;
  state: ParleGState;
  selected: FlowNodeId | null;
  onPlace: (slot: FlowSlotId) => void;
  onDropNode: (node: FlowNodeId, slot: FlowSlotId) => void;
  onClear: (slot: FlowSlotId) => void;
}) {
  const node = state.placements[slot.id];
  const label = FLOW_NODES.find((n) => n.id === node)?.label;
  const rejected = state.rejectedSlots.includes(slot.id);
  const solved = state.flowSolved;

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const id = event.dataTransfer.getData("text/plain") as FlowNodeId;
        if (id && FLOW_NODES.some((n) => n.id === id)) onDropNode(id, slot.id);
      }}
      className={cn(
        "min-h-[88px] rounded-card border-2 p-2.5 transition-colors",
        solved
          ? "border-ion-500/60 bg-ion-500/[0.07]"
          : node
            ? "border-info-500/50 bg-info-500/[0.06]"
            : selected
              ? "border-dashed border-ember-500/60 bg-ember-500/[0.05]"
              : rejected
                ? "border-dashed border-warn-500/60"
                : "border-dashed border-line-strong",
      )}
    >
      <p className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase sm:text-[9.5px]">
        {slot.label}
      </p>
      {node ? (
        <div className="mt-1.5 flex items-start gap-1.5">
          <span className="min-w-0 flex-1 text-[12px] leading-snug font-medium text-hi sm:text-[13px]">
            {label}
          </span>
          {!solved ? (
            <button
              type="button"
              onClick={() => onClear(slot.id)}
              aria-label={`Take ${label} out of ${slot.label}`}
              className="shrink-0 rounded p-0.5 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={!selected}
          onClick={() => onPlace(slot.id)}
          className={cn(
            "mt-1.5 w-full rounded-md px-1 py-1.5 text-left text-[11.5px] leading-snug transition-colors",
            selected ? "text-ember-400 hover:bg-ember-500/[0.08]" : "text-faint",
          )}
        >
          {selected ? "Place here" : slot.hint}
        </button>
      )}
    </div>
  );
}

function DriftLedger({
  name,
  perPick,
  system,
  physical,
  variance,
  onDone,
}: {
  name: string;
  perPick: string;
  system: { from: number; to: number };
  physical: { from: number; to: number };
  variance: number;
  onDone: () => void;
}) {
  const [finished, setFinished] = React.useState(0);
  const done = finished >= 2;
  const doneRef = React.useRef(false);

  React.useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [done, onDone]);

  return (
    <section
      className={cn(
        "rounded-card border bg-surface p-4 transition-colors",
        done ? (variance > 0 ? "border-warn-500/50" : "border-alert-500/50") : "border-line",
      )}
    >
      <p className="text-[13px] font-semibold text-hi">{name}</p>
      <p className="mt-0.5 font-mono text-[10.5px] text-faint">
        {perPick} · ×{AFFECTED_PICKS}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">System</dt>
          <dd className="mt-0.5 font-mono text-[20px] font-semibold text-hi">
            <TickCounter from={system.from} to={system.to} run onDone={() => setFinished((n) => n + 1)} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Physical</dt>
          <dd className="mt-0.5 font-mono text-[20px] font-semibold text-hi">
            <TickCounter from={physical.from} to={physical.to} run onDone={() => setFinished((n) => n + 1)} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">Phys vs sys</dt>
          <dd className="mt-1">
            {done ? <VarianceBadge value={variance} pulse /> : <span className="text-faint">…</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function RootCause({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-ion-500/40 bg-ion-500/[0.05] p-5">
        <p className="font-mono text-[11px] tracking-[0.2em] text-ion-400 uppercase">
          Root cause identified
        </p>
        <p className="mt-2 text-[18px] leading-snug font-semibold text-hi sm:text-[20px]">
          Wrong-size picking
          <span className="text-mid"> + </span>
          incomplete SKU verification
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mid">
          Customers ordered {SKU_30.weight}. {AFFECTED_PICKS} times, a {SKU_40.weight} pack
          physically left the store while the system deducted {SKU_30.weight}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-4">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Value</p>
          <p className="mt-2 font-mono text-[12.5px] text-mid">
            {rupees(SKU_40.unitValue)} − {rupees(SKU_30.unitValue)} = {rupees(VALUE_GAP_PER_PICK)} per
            pick
          </p>
          <p className="font-mono text-[12.5px] text-mid">
            {AFFECTED_PICKS} × {rupees(VALUE_GAP_PER_PICK)}
          </p>
          <p className="mt-2 text-[24px] leading-none font-semibold text-hi tabular-nums">
            {rupees(NET_VALUE_IMPACT)}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
            Net value loss
          </p>
        </section>

        <section className="rounded-card border border-info-500/40 bg-info-500/[0.05] p-4">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-info-500 uppercase">But…</p>
          <p className="mt-2 text-[24px] leading-none font-semibold text-hi tabular-nums">
            {RECORD_UNITS_AFFECTED}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-info-500 uppercase">
            Inventory record units are now wrong
          </p>
          <p className="mt-2 text-[12.5px] text-mid">
            {AFFECTED_PICKS} on {SKU_30.weight} + {AFFECTED_PICKS} on {SKU_40.weight} — the stock a
            customer is told is available, and the stock a replenishment order is sized on.
          </p>
        </section>
      </div>

      <Button variant="primary" size="lg" className="w-full" onClick={onContinue}>
        Decide the correction
        <ArrowRight />
      </Button>
    </div>
  );
}
