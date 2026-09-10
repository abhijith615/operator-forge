"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Boxes, PackageCheck, Search, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ActionCard,
  Consequence,
  InternalMessage,
  MetricsBoard,
  SceneFrame,
  StatusPill,
  StickyAction,
  type Status,
} from "@/components/challenge/ui";
import {
  DISPATCH_BAYS,
  DISPATCH_CHOICES,
  EMPLOYEES,
  FLOW_CHOICES,
  INSPECT_TARGETS,
  NIL_PICK_CHOICES,
  NIL_PICK_ORDER,
  NIL_PICK_SOP,
  PACK_ITEMS,
  PACK_ORDER,
  RECOVERY_ACTIONS,
  STORE_BENCHMARK,
  countAt,
  type RecoveryAction,
} from "@/lib/challenge/day-one";
import { STATION_LABEL, STATIONS } from "@/lib/challenge/types";
import type {
  Metrics,
  SceneChoice,
  StaffingPlan,
  Station,
} from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ══════════════ Scene 1 — Your floor. Your call. ══════════════ */

export function FloorScene({
  metrics,
  plan,
  onChange,
  onConfirm,
}: {
  metrics: Metrics;
  plan: StaffingPlan;
  onChange: (plan: StaffingPlan) => void;
  onConfirm: () => void;
}) {
  const counts = {
    picking: countAt(plan, "picking"),
    packing: countAt(plan, "packing"),
    dispatch: countAt(plan, "dispatch"),
  };

  return (
    <SceneFrame eyebrow="Operations control board" title="Your floor. Your call.">
      <MetricsBoard metrics={metrics} />

      <InternalMessage from="Floor Lead" time="07:13">
        Rakesh hasn&rsquo;t reported today. We&rsquo;re one person short and
        breakfast orders are picking up.
      </InternalMessage>

      <div>
        <h2 className="text-[13px] font-semibold text-hi">
          Set your floor for the next 10 minutes
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-mid">
          Tap a person, then choose where they work. Cross-trained staff can move.
          PPI is this store&rsquo;s picking-per-item benchmark —{" "}
          {STORE_BENCHMARK.ppiHealthyMin}–{STORE_BENCHMARK.ppiHealthyMax}s is healthy here.
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        role="status"
        aria-label={`Picking ${counts.picking}, packing ${counts.packing}, dispatch ${counts.dispatch}`}
      >
        {STATIONS.map((station) => (
          <div key={station} className="rounded-card border border-line bg-surface p-2.5 text-center">
            <p className="text-[10px] tracking-[0.08em] text-lo uppercase">
              {STATION_LABEL[station]}
            </p>
            <p data-readout className="mt-1 text-[19px] leading-none font-semibold text-hi tabular-nums">
              {counts[station]}
            </p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {EMPLOYEES.map((employee) => {
          const at = plan[employee.id] ?? employee.primary;
          const allowed: Station[] = [
            employee.primary,
            ...(employee.secondary ? [employee.secondary] : []),
          ];

          return (
            <li key={employee.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[14px] font-medium text-hi">{employee.name}</span>
                <span className="font-mono text-[11px] text-lo">
                  {employee.ppi ? `PPI ${employee.ppi}s · ` : ""}
                  {employee.accuracyLabel} {employee.accuracy}%
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5" role="group"
                aria-label={`Station for ${employee.name}`}>
                {STATIONS.map((station) => {
                  const can = allowed.includes(station);
                  const active = at === station;
                  return (
                    <button
                      key={station}
                      type="button"
                      disabled={!can}
                      aria-pressed={active}
                      onClick={() => onChange({ ...plan, [employee.id]: station })}
                      className={cn(
                        "min-h-[38px] rounded-full border px-3.5 text-[12.5px] font-medium transition-colors duration-200",
                        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                        active
                          ? "border-ember-500 bg-ember-500 text-void"
                          : can
                            ? "border-line-strong text-mid hover:border-ember-500/50 hover:text-hi"
                            : "cursor-not-allowed border-line text-faint opacity-50",
                      )}
                    >
                      {STATION_LABEL[station]}
                      {!can ? <span className="sr-only"> — not trained</span> : null}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <StickyAction>
        <Button variant="primary" size="lg" className="w-full" onClick={onConfirm}>
          Confirm floor
          <ArrowRight />
        </Button>
      </StickyAction>
    </SceneFrame>
  );
}

/* ══════════════ Scene 2 — The queue is moving ══════════════ */

const ORDER_FLOW = [
  { id: "#4821", stages: ["Picking", "Packing", "Rider"], at: 2 },
  { id: "#4822", stages: ["Picking", "Packing", "Rider"], at: 1 },
  { id: "#4823", stages: ["Picking", "Packing", "Rider"], at: 0 },
];

function OrderFlow() {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-2" aria-label="Orders in flight">
      {ORDER_FLOW.map((order, row) => (
        <div key={order.id} className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
          <span className="font-mono text-[12px] text-hi">{order.id}</span>
          <div className="ml-auto flex items-center gap-1">
            {order.stages.map((stage, index) => (
              <React.Fragment key={stage}>
                {index > 0 ? <span aria-hidden className="text-faint">→</span> : null}
                <motion.span
                  initial={reduced ? false : { opacity: 0.35 }}
                  animate={{ opacity: index <= order.at ? 1 : 0.35 }}
                  transition={{ duration: 0.4, delay: reduced ? 0 : row * 0.12 + index * 0.08 }}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10.5px]",
                    index <= order.at ? "bg-ember-500/15 text-ember-400" : "text-faint",
                  )}
                >
                  {stage}
                </motion.span>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FlowScene({
  metrics,
  previous,
  onChoose,
}: {
  metrics: Metrics;
  previous: Metrics | null;
  onChoose: (choice: SceneChoice) => void;
}) {
  return (
    <SceneFrame eyebrow="Live fulfillment flow" title="The queue is moving.">
      <MetricsBoard metrics={metrics} previous={previous} />
      <OrderFlow />

      <div className="rounded-card border border-warn-500/40 bg-warn-500/[0.06] p-4">
        <StatusPill status="warning">Packing queue {metrics.packingQueue}</StatusPill>
        <p className="mt-2.5 text-[13px] leading-relaxed text-hi">
          Orders are reaching packing faster than they&rsquo;re leaving it.
        </p>
      </div>

      <div>
        <h2 className="text-[13px] font-semibold text-hi">
          You have capacity for one move.
        </h2>
      </div>

      <div className="space-y-2">
        {FLOW_CHOICES.map((choice) => (
          <ActionCard
            key={choice.id}
            label={choice.label}
            detail={choice.detail}
            onSelect={() => onChoose(choice)}
          />
        ))}
      </div>
    </SceneFrame>
  );
}

/* ══════════════ Scene 3 — Milk is missing ══════════════ */

export function NilPickScene({
  metrics,
  inspected,
  onInspect,
  onSop,
  onChoose,
}: {
  metrics: Metrics;
  inspected: string[];
  onInspect: (id: string) => void;
  onSop: () => void;
  onChoose: (choice: SceneChoice) => void;
}) {
  const [sopOpen, setSopOpen] = React.useState(false);
  const found = inspected.includes("replenishment");

  return (
    <SceneFrame eyebrow="Picking aisle · handheld" title="Milk is missing.">
      <div className="rounded-card border border-alert-500/45 bg-alert-500/[0.06] p-4">
        <StatusPill status="critical">Nil pick alert</StatusPill>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
          <div><dt className="text-lo">Order</dt><dd className="font-mono text-hi">{NIL_PICK_ORDER.order}</dd></div>
          <div><dt className="text-lo">Product</dt><dd className="text-hi">{NIL_PICK_ORDER.product}</dd></div>
          <div><dt className="text-lo">Location</dt><dd className="font-mono text-hi">{NIL_PICK_ORDER.location}</dd></div>
          <div><dt className="text-lo">System stock</dt><dd className="font-mono text-hi">{NIL_PICK_ORDER.systemStock} units</dd></div>
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-[13px] text-mid">
          Picker: &ldquo;Shelf empty.&rdquo;
        </p>
      </div>

      <div>
        <h2 className="text-[13px] font-semibold text-hi">What do you want checked?</h2>
        <p className="mt-1 text-[12.5px] text-mid">
          System says 28. The pick face says nothing. Somewhere between those two
          is the answer.
        </p>
      </div>

      <ul className="space-y-2">
        {INSPECT_TARGETS.map((target) => {
          const done = inspected.includes(target.id);
          return (
            <li key={target.id}>
              <button
                type="button"
                onClick={() => onInspect(target.id)}
                disabled={done}
                className={cn(
                  "w-full rounded-card border p-3.5 text-left transition-colors duration-200 min-h-[60px]",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  done
                    ? target.units > 0
                      ? "border-ion-500/45 bg-ion-500/[0.07]"
                      : "border-line bg-surface/60"
                    : "border-line bg-surface hover:border-ember-500/40",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Search className="size-4 shrink-0 text-lo" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-hi">{target.label}</span>
                    <span className="block text-[12px] text-lo">{target.detail}</span>
                  </span>
                  {done ? (
                    <span
                      data-readout
                      className={cn(
                        "shrink-0 font-mono text-[12.5px] font-semibold tabular-nums",
                        target.units > 0 ? "text-ion-400" : "text-faint",
                      )}
                    >
                      {target.units} units
                    </span>
                  ) : null}
                </span>
                {done ? (
                  <span className="mt-2 block border-t border-line pt-2 text-[12.5px] text-mid">
                    {target.reveal}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {found ? (
          <Consequence
            status="healthy"
            headline="Stock found"
            body="16 units are still on the replenishment pallet. System inventory wasn't wrong — the pick face was empty."
          />
        ) : null}
      </AnimatePresence>

      <div>
        <h2 className="text-[13px] font-semibold text-hi">Your next move?</h2>
        {!found ? (
          <p className="mt-1 text-[12.5px] text-warn-500">
            You can decide now, or check more locations first.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {NIL_PICK_CHOICES.map((choice) => (
          <ActionCard
            key={choice.id}
            label={choice.label}
            detail={choice.detail}
            onSelect={() => onChoose(choice)}
          />
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            setSopOpen((open) => !open);
            if (!sopOpen) onSop();
          }}
          aria-expanded={sopOpen}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-lo transition-colors hover:text-hi"
        >
          <BookOpen className="size-3.5" aria-hidden />
          {sopOpen ? "Hide SOP" : "View SOP"}
        </button>
        {sopOpen ? (
          <p className="mt-2 rounded-card border border-line bg-elevated p-3.5 text-[12.5px] leading-relaxed text-mid">
            <span className="font-semibold text-hi">Nil Pick / Item Not Found. </span>
            {NIL_PICK_SOP}
          </p>
        ) : null}
      </div>
      <p className="sr-only">Metrics: click to dispatch {metrics.ctd} seconds.</p>
    </SceneFrame>
  );
}

/* ══════════════ Scene 4 — Would you let this bag leave? ══════════════ */

type Bag = "bag-1" | "bag-2";

export function PackingScene({
  onSubmit,
}: {
  onSubmit: (bags: Record<string, Bag>, protection: Record<string, string>) => void;
}) {
  const [bags, setBags] = React.useState<Record<string, Bag>>(
    Object.fromEntries(PACK_ITEMS.map((item) => [item.id, "bag-1" as Bag])),
  );
  const [protection, setProtection] = React.useState<Record<string, string>>(
    Object.fromEntries(PACK_ITEMS.map((item) => [item.id, "standard"])),
  );

  const options: Record<string, { id: string; label: string }[]> = {
    fragile: [
      { id: "standard", label: "Standard" },
      { id: "fragile", label: "Fragile protection" },
    ],
    chilled: [
      { id: "standard", label: "Standard" },
      { id: "chilled", label: "Chilled packaging" },
    ],
  };

  return (
    <SceneFrame eyebrow="Packing station" title="Would you let this bag leave?">
      <InternalMessage from="Packer" time="07:25">
        Breakfast rush. Can this go in one bag?
      </InternalMessage>

      <div className="rounded-card border border-line bg-surface p-3">
        <p className="font-mono text-[12px] text-hi">Order {PACK_ORDER}</p>
        <p className="mt-1 text-[12px] text-lo">
          Four items. Two bags available. Assign each one and choose how it travels.
        </p>
      </div>

      <ul className="space-y-2">
        {PACK_ITEMS.map((item) => {
          const handling = options[item.kind];
          return (
            <li key={item.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium text-hi">{item.name}</span>
                <span className="font-mono text-[12px] text-lo">{item.qty}</span>
                <span className="ml-auto text-[11px] text-faint">{item.hint}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={`Bag for ${item.name}`}>
                {(["bag-1", "bag-2"] as Bag[]).map((bag) => (
                  <button
                    key={bag}
                    type="button"
                    aria-pressed={bags[item.id] === bag}
                    onClick={() => setBags((prev) => ({ ...prev, [item.id]: bag }))}
                    className={cn(
                      "min-h-[38px] rounded-full border px-3.5 text-[12.5px] font-medium transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      bags[item.id] === bag
                        ? "border-ember-500 bg-ember-500 text-void"
                        : "border-line-strong text-mid hover:text-hi",
                    )}
                  >
                    {bag === "bag-1" ? "Bag 1" : "Bag 2"}
                  </button>
                ))}

                {handling
                  ? handling.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={protection[item.id] === option.id}
                        onClick={() =>
                          setProtection((prev) => ({ ...prev, [item.id]: option.id }))
                        }
                        className={cn(
                          "min-h-[38px] rounded-full border px-3.5 text-[12.5px] transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                          protection[item.id] === option.id
                            ? "border-flux-500 bg-flux-500/20 text-flux-400"
                            : "border-line-strong text-mid hover:text-hi",
                        )}
                      >
                        {option.label}
                      </button>
                    ))
                  : null}
              </div>
            </li>
          );
        })}
      </ul>

      <StickyAction>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => onSubmit(bags, protection)}
        >
          <PackageCheck />
          Seal and send to dispatch
        </Button>
      </StickyAction>
    </SceneFrame>
  );
}

/* ══════════════ Scene 5 — The rider is waiting ══════════════ */

export function DispatchScene({
  metrics,
  previous,
  onChoose,
}: {
  metrics: Metrics;
  previous: Metrics | null;
  onChoose: (choice: SceneChoice) => void;
}) {
  return (
    <SceneFrame eyebrow="Dispatch bay" title="The rider is waiting.">
      <MetricsBoard metrics={metrics} previous={previous} compact />

      <ul className="space-y-2">
        {DISPATCH_BAYS.map((bay) => (
          <li
            key={bay.bay}
            className="flex items-center gap-3 rounded-card border border-line bg-surface px-3 py-2.5"
          >
            <Truck className="size-4 shrink-0 text-lo" aria-hidden />
            <span className="font-mono text-[12.5px] text-hi">{bay.bay}</span>
            <span className="font-mono text-[12.5px] text-mid">{bay.order}</span>
            <span
              className={cn(
                "ml-auto text-[11.5px]",
                bay.state.startsWith("Verified") ? "text-ion-400" : "text-warn-500",
              )}
            >
              {bay.state}
            </span>
          </li>
        ))}
      </ul>

      <InternalMessage from="Rider 218" time="07:28">
        Scanner isn&rsquo;t reading. I&rsquo;m already late. Just give me the bag.
      </InternalMessage>

      <div className="space-y-2">
        {DISPATCH_CHOICES.map((choice) => (
          <ActionCard
            key={choice.id}
            label={choice.label}
            detail={choice.detail}
            onSelect={() => onChoose(choice)}
          />
        ))}
      </div>
    </SceneFrame>
  );
}

/* ══════════════ Scene 6 — You have 90 seconds ══════════════ */

export function RecoveryScene({
  metrics,
  onExecute,
}: {
  metrics: Metrics;
  onExecute: (actions: RecoveryAction[]) => void;
}) {
  const [chosen, setChosen] = React.useState<string[]>([]);

  function toggle(id: string) {
    setChosen((prev) =>
      prev.includes(id)
        ? prev.filter((entry) => entry !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id],
    );
  }

  const ready = chosen.length === 3;

  return (
    <SceneFrame eyebrow="Peak recovery command" title="You have 90 seconds.">
      <div className="rounded-card border border-alert-500/45 bg-alert-500/[0.06] p-3.5">
        <StatusPill status="critical">Peak alert</StatusPill>
      </div>

      <MetricsBoard metrics={metrics} />

      <InternalMessage from="Cluster Manager" time="07:31">
        CTD has crossed target. Give me your recovery plan.
      </InternalMessage>

      <div>
        <h2 className="text-[13px] font-semibold text-hi">
          Choose 3 actions. Tap them in the order you would execute them.
        </h2>
        <p className="mt-1 text-[12.5px] text-mid" role="status" aria-live="polite">
          {chosen.length} of 3 selected
          {chosen.length > 0 ? " — tap again to remove" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {RECOVERY_ACTIONS.map((action) => {
          const position = chosen.indexOf(action.id);
          return (
            <ActionCard
              key={action.id}
              label={action.label}
              detail={action.detail}
              selected={position >= 0}
              index={position >= 0 ? position + 1 : undefined}
              disabled={position < 0 && chosen.length >= 3}
              onSelect={() => toggle(action.id)}
            />
          );
        })}
      </div>

      <StickyAction>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!ready}
          onClick={() =>
            onExecute(
              chosen
                .map((id) => RECOVERY_ACTIONS.find((action) => action.id === id))
                .filter((action): action is RecoveryAction => Boolean(action)),
            )
          }
        >
          <Boxes />
          {ready ? "Execute recovery plan" : `Select ${3 - chosen.length} more`}
        </Button>
      </StickyAction>
    </SceneFrame>
  );
}

/* ══════════════ Metric impact playback ══════════════ */

/**
 * Walks the store through the plan one step at a time so the operator watches
 * their own sequence land, rather than being shown a final number.
 */
export function RecoveryPlayback({
  steps,
  onDone,
}: {
  steps: { label: string; metricsAfter: Metrics }[];
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    if (shown >= steps.length) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), reduced ? 260 : 900);
    return () => window.clearTimeout(timer);
  }, [shown, steps.length, reduced]);

  const done = shown >= steps.length;
  const current = steps[Math.max(0, shown - 1)];

  return (
    <SceneFrame eyebrow="Executing" title="The store responds.">
      <div className="space-y-2">
        {steps.slice(0, shown).map((step, index) => (
          <motion.div
            key={step.label}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: easing.outExpo }}
            className="flex items-start gap-3 rounded-card border border-line bg-surface p-3"
          >
            <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-ember-500 font-mono text-[11px] font-semibold text-void">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-hi">{step.label}</span>
            <span data-readout className="shrink-0 font-mono text-[12.5px] text-mid tabular-nums">
              {step.metricsAfter.ctd}s
            </span>
          </motion.div>
        ))}
      </div>

      {current ? <MetricsBoard metrics={current.metricsAfter} /> : null}

      {done ? (
        <StickyAction>
          <Button variant="primary" size="lg" className="w-full" onClick={onDone}>
            End of shift
            <ArrowRight />
          </Button>
        </StickyAction>
      ) : null}
    </SceneFrame>
  );
}

/* ══════════════ Shared consequence step ══════════════ */

export function ConsequenceStep({
  status,
  headline,
  body,
  metrics,
  previous,
  cta,
  onContinue,
}: {
  status: Status;
  headline: string;
  body: string;
  metrics: Metrics;
  previous: Metrics | null;
  cta: string;
  onContinue: () => void;
}) {
  return (
    <SceneFrame eyebrow="The store reacts" title={headline}>
      <Consequence status={status} headline={headline} body={body} />
      <MetricsBoard metrics={metrics} previous={previous} />
      <StickyAction>
        <Button variant="primary" size="lg" className="w-full" onClick={onContinue}>
          {cta}
          <ArrowRight />
        </Button>
      </StickyAction>
    </SceneFrame>
  );
}
