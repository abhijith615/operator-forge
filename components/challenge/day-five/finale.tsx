"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Minus, Plus, X } from "lucide-react";

import {
  CaseHeading,
  CustomerJourney,
  InspectButton,
  NodeMark,
  SystemChip,
} from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { fundLeft } from "@/lib/challenge/day-five/engine";
import { finaleOutcome } from "@/lib/challenge/day-five/outcome";
import { CUSTOMERS, FUND_TOTAL, RESOURCES } from "@/lib/challenge/day-five/scenario";
import {
  CUSTOMER_IDS,
  RESOURCE_IDS,
  type CustomerId,
  type Day5State,
  type JourneyNode,
  type NodeState,
  type ResourceId,
} from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Three customers, one manager.
 *
 * Not a ranking question. Every one of these is solvable, and the puzzle is
 * that they need different kinds of ownership — a bag, a person, and your own
 * authority. The scarce things are the manager slot, the associate and the
 * money; everything else is ordinary operational kit.
 */
export function CustomerFinale({
  state,
  time,
  onOpenCustomer,
  onAssign,
  onSpend,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onOpenCustomer: (customer: CustomerId) => void;
  onAssign: (resource: ResourceId, customer: CustomerId | null) => void;
  onSpend: (customer: CustomerId, delta: number) => void;
  onConfirm: () => void;
}) {
  const finale = state.finale;
  const reduced = useReducedMotion();
  const [held, setHeld] = React.useState<ResourceId | null>(null);
  const recoveries = finaleOutcome(finale);
  const left = fundLeft(finale);

  const journeyFor = (id: CustomerId): Partial<Record<JourneyNode, NodeState>> => {
    const done: NodeState = recoveries[id].protected ? "clear" : "broken";
    return {
      ordered: "clear",
      picking: "clear",
      packing: id === "breakfast" ? (recoveries[id].protected ? "clear" : "broken") : "clear",
      handover: id === "breakfast" && !recoveries[id].protected ? "broken" : "clear",
      delivery: id === "elderly" ? done : "clear",
      use: done,
    };
  };

  const assignedTo = (customer: CustomerId) =>
    RESOURCE_IDS.filter((resource) => finale.assigned[resource] === customer);

  return (
    <section aria-label="Three customers" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow="Final · 7:01 PM"
        title="Three customers. One manager."
        sub="All three are solvable. They do not need the same thing from you."
      />

      {/* ── The three journeys ── */}
      <div className="grid gap-2.5 lg:grid-cols-3">
        {CUSTOMER_IDS.map((id) => {
          const customer = CUSTOMERS[id];
          const recovery = recoveries[id];
          const open = finale.inspected.includes(id);
          const mine = assignedTo(id);
          const isTarget = held !== null;
          return (
            <div
              key={id}
              onDragOver={(event) => {
                if (finale.confirmed) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const resource = event.dataTransfer.getData("text/plain") as ResourceId;
                if (resource) onAssign(resource, id);
                setHeld(null);
              }}
              className={cn(
                "flex flex-col rounded-card border p-3.5 transition-colors",
                recovery.protected ? "border-ion-500/40 bg-ion-500/[0.04]" : "border-line-strong bg-surface",
                isTarget && !finale.confirmed && "outline-1 outline-ember-500/50 outline-dashed",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                  {customer.name} · {customer.order}
                </span>
                <NodeMark state={recovery.protected ? "clear" : "broken"} />
              </div>
              <p className="mt-1.5 text-[13.5px] leading-snug font-semibold text-hi">{customer.headline}</p>
              <p className="mt-1 font-mono text-[10.5px] text-lo">{customer.basket}</p>

              <CustomerJourney className="mt-3" compact states={journeyFor(id)} />

              <InspectButton
                label="Open the case"
                detail={open ? customer.need : "What they are actually holding"}
                open={open}
                onOpen={() => onOpenCustomer(id)}
                className="mt-3"
              />

              {open ? (
                <ul className="mt-2 space-y-1">
                  {customer.detail.map((line) => (
                    <li key={line} className="text-[11.5px] leading-relaxed text-mid">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* What is on this customer now */}
              <div className="mt-3 min-h-[42px] rounded-md border border-dashed border-line-strong p-2">
                {mine.length === 0 && finale.spend[id] === 0 ? (
                  <p className="text-center text-[10.5px] text-faint">
                    {held ? "Drop a resource here" : "Nothing assigned"}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {mine.map((resource) => (
                      <li key={resource}>
                        <button
                          type="button"
                          disabled={finale.confirmed}
                          onClick={() => onAssign(resource, null)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ember-500/50 bg-ember-500/10 px-2.5 py-1 font-mono text-[10px] text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                        >
                          {RESOURCES[resource].label}
                          <X className="size-2.5 text-lo" aria-hidden />
                        </button>
                      </li>
                    ))}
                    {finale.spend[id] > 0 ? (
                      <li className="inline-flex items-center rounded-full border border-flux-400/50 bg-flux-500/10 px-2.5 py-1 font-mono text-[10px] text-flux-400">
                        ₹{finale.spend[id]}
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>

              {/* Tap alternative to dragging */}
              {held !== null && !finale.confirmed ? (
                <button
                  type="button"
                  onClick={() => {
                    onAssign(held, id);
                    setHeld(null);
                  }}
                  className="mt-2 min-h-11 w-full rounded-md border border-ember-500/50 bg-ember-500/10 text-[11.5px] font-medium text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                >
                  Assign {RESOURCES[held].label} here
                </button>
              ) : null}

              {/* Discretionary money, in fixed steps */}
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">Fund</span>
                <button
                  type="button"
                  disabled={finale.confirmed || finale.spend[id] === 0}
                  onClick={() => onSpend(id, -1)}
                  aria-label={`Less recovery money for ${customer.name}`}
                  className="grid size-8 place-items-center rounded-md border border-line bg-elevated text-lo disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                >
                  <Minus className="size-3" aria-hidden />
                </button>
                <span data-readout className="min-w-[46px] text-center font-mono text-[12px] text-hi tabular-nums">
                  ₹{finale.spend[id]}
                </span>
                <button
                  type="button"
                  disabled={finale.confirmed || left === 0}
                  onClick={() => onSpend(id, 1)}
                  aria-label={`More recovery money for ${customer.name}`}
                  className="grid size-8 place-items-center rounded-md border border-line bg-elevated text-lo disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                >
                  <Plus className="size-3" aria-hidden />
                </button>
              </div>

              <motion.p
                key={recovery.headline}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "mt-2.5 text-[11.5px] leading-relaxed",
                  recovery.protected ? "text-ion-400" : "text-warn-500",
                )}
              >
                {recovery.detail}
              </motion.p>
            </div>
          );
        })}
      </div>

      {/* ── The shared dock ── */}
      <div className="sticky bottom-0 z-10 rounded-card border border-line-strong bg-obsidian/92 p-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Shared resources</p>
          <SystemChip label="Fund left" value={`₹${left} / ${FUND_TOTAL}`} tone={left === 0 ? "warn" : "neutral"} />
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {RESOURCE_IDS.filter((resource) => resource !== "fund").map((resource) => {
            const spec = RESOURCES[resource];
            const on = finale.assigned[resource];
            return (
              <li key={resource}>
                <button
                  type="button"
                  draggable={!finale.confirmed}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", resource);
                    setHeld(resource);
                  }}
                  onDragEnd={() => setHeld(null)}
                  aria-pressed={held === resource}
                  disabled={finale.confirmed}
                  onClick={() => setHeld(held === resource ? null : resource)}
                  className={cn(
                    "flex min-h-11 flex-col items-start rounded-card border px-3 py-2 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    held === resource
                      ? "border-ember-500 bg-ember-500/15"
                      : on
                        ? "border-ion-500/45 bg-ion-500/[0.06]"
                        : "border-line bg-elevated hover:border-line-bright",
                    spec.scarce && !on ? "ring-1 ring-warn-500/25" : "",
                  )}
                >
                  <span className="text-[12px] font-semibold text-hi">{spec.label}</span>
                  <span className="font-mono text-[9.5px] text-faint">
                    {on ? `On ${CUSTOMERS[on].name}` : spec.detail}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onConfirm}>
        Commit the recovery
        <ArrowRight />
      </Button>
    </section>
  );
}
