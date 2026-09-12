"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

import { BakingCase } from "@/components/challenge/day-five/baking-case";
import { BatchCase } from "@/components/challenge/day-five/batch-case";
import { CloseTheLoop } from "@/components/challenge/day-five/close-the-loop";
import { CustomerFinale } from "@/components/challenge/day-five/finale";
import { MilkCase } from "@/components/challenge/day-five/milk-case";
import { DayFiveOpening } from "@/components/challenge/day-five/opening";
import { PackingCase } from "@/components/challenge/day-five/packing-case";
import { Day5Scorecard } from "@/components/challenge/day-five/scorecard";
import { CustomerJourney, NodeMark } from "@/components/challenge/day-five/ui";
import { CountdownPill } from "@/components/challenge/day-two/ui";
import { SHIFT_SECONDS, timeScale } from "@/lib/challenge/clock";
import * as E from "@/lib/challenge/day-five/engine";
import { buildDay5Result } from "@/lib/challenge/day-five/feedback";
import { caseOutcomes, finaleOutcome, packingSafety } from "@/lib/challenge/day-five/outcome";
import { INCIDENTS, clockAt } from "@/lib/challenge/day-five/scenario";
import { tagsSoFar } from "@/lib/challenge/day-five/scoring";
import {
  CASE_IDS,
  type BagId,
  type BasketItemId,
  type BatchAction,
  type CaseId,
  type ContactOption,
  type ControlId,
  type CustomerId,
  type Day5State,
  type IncidentId,
  type JourneyNode,
  type MilkBatchId,
  type NodeState,
  type PackExtra,
  type PackItemId,
  type ResourceId,
  type ShelfSlot,
} from "@/lib/challenge/day-five/types";
import { saveChallengeRun } from "@/lib/challenge/save-run";
import { logEvent, type ChallengeEventName } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { easing } from "@/lib/motion";
import { playNotificationSound } from "@/lib/sound";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Partial<Record<Day5State["phase"], string>> = {
  milk: "Chilled shelf",
  baking: "Order #8426",
  packing: "Packing station P3",
  batch: "Support escalation",
  finale: "Three customers",
  loop: "Close the loop",
};

/**
 * Day 5 — Protect the Promise.
 *
 * This component owns the evening's state and the clock, and is the only place
 * telemetry is emitted. Every decision goes through `apply`, which computes the
 * next state before setting it — the engine is pure, so an event fires exactly
 * once with the state on either side of it.
 */
export function DayFiveSimulation({ operatorName }: { operatorName: string }) {
  const [started, setStarted] = React.useState(false);
  const [initial, setInitial] = React.useState<Day5State | null>(null);

  if (!started || !initial) {
    return (
      <DayFiveOpening
        onStart={() => {
          const now = Date.now();
          setInitial(E.startRun(E.createDay5(), now));
          setStarted(true);
          logEvent("day5_started", { operator: operatorName, simulatedTime: "6:42 PM" }, 5);
        }}
      />
    );
  }
  return <Evening initial={initial} />;
}

function Evening({ initial }: { initial: Day5State }) {
  const [state, setState] = React.useState<Day5State>(initial);
  const [now, setNow] = React.useState(() => Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [result, setResult] = React.useState<ChallengeResult | null>(null);
  const soundEnabled = useShellStore((s) => s.soundEnabled);
  const setSoundEnabled = useShellStore((s) => s.setSoundEnabled);
  const reduced = useReducedMotion();

  const stateRef = React.useRef(state);
  const apply = React.useCallback(
    (fn: (s: Day5State) => Day5State, after?: (prev: Day5State, next: Day5State) => void) => {
      const prev = stateRef.current;
      const next = fn(prev);
      if (next === prev) return;
      stateRef.current = next;
      setState(next);
      after?.(prev, next);
    },
    [],
  );

  const chime = React.useCallback((tone: "critical" | "warning" | "info" | "positive" | "neutral") => {
    if (useShellStore.getState().soundEnabled) playNotificationSound(tone);
  }, []);

  /** Every event carries the store clock, both sides of the decision, and its customer impact. */
  const log = React.useCallback(
    (name: ChallengeEventName, prev: Day5State, next: Day5State, decision: Record<string, unknown> = {}) => {
      const before = caseOutcomes(prev);
      const afterCases = caseOutcomes(next);
      logEvent(
        name,
        {
          simulatedTime: clockAt(E.simMinute(prev, Date.now())),
          caseId: next.phase,
          decision,
          stateBefore: E.d5Snapshot(prev),
          stateAfter: E.d5Snapshot(next),
          customerImpact: CASE_IDS.reduce<Record<string, string>>((acc, id) => {
            if (before[id].use !== afterCases[id].use) acc[id] = `${before[id].use} → ${afterCases[id].use}`;
            return acc;
          }, {}),
          costImpact: CASE_IDS.reduce((sum, id) => sum + afterCases[id].cost - before[id].cost, 0),
          slaImpact: CASE_IDS.reduce((sum, id) => sum + afterCases[id].ctd - before[id].ctd, 0),
          behaviouralTags: tagsSoFar(next),
        },
        5,
      );
    },
    [],
  );

  /* ── The clock ── */
  const playing = state.phase !== "done";
  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setElapsed((value) => value + 1);
    }, 1000 / timeScale());
    return () => window.clearInterval(timer);
  }, [playing]);
  const remaining = Math.max(0, SHIFT_SECONDS - elapsed);

  /* ── Finishing, by the operator or by the clock ── */
  const finish = React.useCallback(
    (by: "operator" | "clock") => {
      const at = Date.now();
      apply(
        (s) => (by === "clock" ? E.lockRun(s, at, "clock") : E.finishRun(s, at)),
        (prev, next) => {
          const built = buildDay5Result(next);
          setResult(built);
          const protectedCount = built.promise?.journeys.filter((j) => j.state === "clear").length ?? 0;
          logEvent("promise_protected", { count: protectedCount }, 5);
          logEvent("promise_compromised", { count: 7 - protectedCount }, 5);
          logEvent("day5_completed", { score: built.score, band: built.band, style: built.signature.name }, 5);
          const decisions = [
            { scene: "milk", action: `${next.milk.placed.fresh36}/${next.milk.placed.fresh72}` },
            { scene: "baking", action: `${next.baking.resolution ?? "none"}:${next.baking.customerChose ?? "-"}` },
            {
              scene: "packing",
              action: `${packingSafety(next.packing).safe ? "segregated" : "mixed"}:${next.packing.extras.join("+") || "none"}`,
            },
            { scene: "batch", action: next.batch.actions.join("+") || "none" },
            {
              scene: "finale",
              action: Object.entries(next.finale.assigned)
                .map(([resource, customer]) => `${resource}:${customer}`)
                .join(" "),
            },
            { scene: "loop", action: Object.entries(next.loop.links).map(([i, c]) => `${i}:${c}`).join(" ") },
          ];
          void saveChallengeRun(built, decisions, 5);
          void prev;
          chime("neutral");
        },
      );
    },
    [apply, chime],
  );

  React.useEffect(() => {
    if (remaining > 0 || !playing) return;
    finish("clock");
  }, [remaining, playing, finish]);

  // The operator reaching the end of the loop finishes the run.
  React.useEffect(() => {
    if (state.phase === "done" && !result) finish("operator");
  }, [state.phase, result, finish]);

  const sim = E.simMinute(state, now);
  const time = clockAt(sim);

  if (state.phase === "done" && result) return <Day5Scorecard result={result} />;

  /* ── Handlers ── */
  const moveBatch = (batch: MilkBatchId, slot: ShelfSlot) =>
    apply(
      (s) => E.moveBatch(s, batch, slot),
      (prev, next) => log("batch_destination_changed", prev, next, { batch, slot }),
    );

  const inspectMilk = (id: "use" | "policy") =>
    apply(
      (s) => E.readMilkPanel(s, id),
      (prev, next) =>
        log(id === "use" ? "customer_context_inspected" : "policy_context_inspected", prev, next, { panel: id }),
    );

  const confirmMilk = () =>
    apply(
      (s) => E.confirmMilk(s, Date.now()),
      (prev, next) => {
        log("customer_recovery_selected", prev, next, { case: "milk", placed: next.milk.placed });
        log("customer_case_opened", prev, next, { case: "baking" });
        chime("warning");
      },
    );

  const inspectItem = (item: BasketItemId) =>
    apply(
      (s) => E.inspectItem(s, item),
      (prev, next) => log("customer_context_inspected", prev, next, { item, dependency: next.baking.dependencySeen }),
    );

  const checkStock = () =>
    apply(
      (s) => E.checkStock(s),
      (prev, next) => log("customer_context_inspected", prev, next, { panel: "stock" }),
    );

  const checkSubstitutes = () =>
    apply(
      (s) => E.checkSubstitutes(s),
      (prev, next) => log("substitution_checked", prev, next, {}),
    );

  const holdOrder = () =>
    apply(
      (s) => E.holdOrder(s),
      (prev, next) => log("customer_recovery_selected", prev, next, { action: "hold" }),
    );

  const toggleOffer = (option: ContactOption) =>
    apply(
      (s) => E.toggleOffer(s, option),
      (prev, next) => log("customer_contact_opened", prev, next, { offered: next.baking.offered }),
    );

  const contactCustomer = () =>
    apply(
      (s) => E.contactCustomer(s, Date.now()),
      (prev, next) => {
        log("customer_contact_opened", prev, next, {
          sent: true,
          offered: next.baking.offered,
          reply: next.baking.customerChose,
        });
        chime("info");
      },
    );

  const dispatchBaking = () =>
    apply(
      (s) => E.dispatchBaking(s),
      (prev, next) => log("customer_recovery_selected", prev, next, { action: "refund" }),
    );

  const cancelBaking = () =>
    apply(
      (s) => E.cancelBaking(s),
      (prev, next) => log("customer_recovery_selected", prev, next, { action: "cancel" }),
    );

  const confirmBaking = () =>
    apply(
      (s) => E.confirmBaking(s, Date.now()),
      (prev, next) => {
        log("customer_case_opened", prev, next, { case: "packing" });
        chime("warning");
      },
    );

  const moveItem = (item: PackItemId, bag: BagId) =>
    apply(
      (s) => E.moveItem(s, item, bag),
      (prev, next) => log("packing_item_moved", prev, next, { item, bag }),
    );

  const toggleExtra = (extra: PackExtra) =>
    apply(
      (s) => E.toggleExtra(s, extra),
      (prev, next) => log("extra_packaging_added", prev, next, { extra, extras: next.packing.extras }),
    );

  const inspectPacking = (id: string) =>
    apply(
      (s) => E.readPackingPanel(s, id),
      (prev, next) => log("customer_context_inspected", prev, next, { panel: id }),
    );

  const confirmPacking = (unsafe: boolean) =>
    apply(
      (s) => E.confirmPacking(s, Date.now(), unsafe),
      (prev, next) => {
        if (unsafe) log("unsafe_pack_confirmed", prev, next, { bags: next.packing.bags });
        log("customer_case_opened", prev, next, { case: "batch" });
        chime(unsafe ? "critical" : "warning");
      },
    );

  const inspectBatch = (id: "evidence" | "inventory") =>
    apply(
      (s) => E.readBatchPanel(s, id),
      (prev, next) => log("customer_context_inspected", prev, next, { panel: id }),
    );

  const batchAction = (action: BatchAction) =>
    apply(
      (s) => E.takeBatchAction(s, action),
      (prev, next) => {
        if (action === "freeze") log("batch_freeze_selected", prev, next, { units: 24 });
        else if (action === "pausePicks") log("active_pick_paused", prev, next, { waves: 3 });
        else log("customer_recovery_selected", prev, next, { action });
      },
    );

  const confirmBatch = () =>
    apply(
      (s) => E.confirmBatch(s, Date.now()),
      (prev, next) => {
        log("customer_case_opened", prev, next, { case: "finale" });
        chime("warning");
      },
    );

  const openCustomer = (customer: CustomerId) =>
    apply(
      (s) => E.openCustomer(s, customer),
      (prev, next) => log("customer_context_inspected", prev, next, { customer }),
    );

  const assignResource = (resource: ResourceId, customer: CustomerId | null) =>
    apply(
      (s) => E.assignResource(s, resource, customer),
      (prev, next) => log("finale_resource_assigned", prev, next, { resource, customer }),
    );

  const spendFund = (customer: CustomerId, delta: number) =>
    apply(
      (s) => E.spendFund(s, customer, delta),
      (prev, next) => log("recovery_budget_used", prev, next, { customer, spend: next.finale.spend }),
    );

  const confirmFinale = () =>
    apply(
      (s) => E.confirmFinale(s, Date.now()),
      (prev, next) => {
        const recoveries = finaleOutcome(next.finale);
        log("customer_recovery_selected", prev, next, {
          protected: Object.entries(recoveries)
            .filter(([, value]) => value.protected)
            .map(([id]) => id),
        });
        chime("info");
      },
    );

  const linkControl = (incident: IncidentId, control: ControlId | null) =>
    apply(
      (s) => E.linkControl(s, incident, control),
      (prev, next) => log("preventive_control_linked", prev, next, { incident, control }),
    );

  const confirmLoop = () =>
    apply(
      (s) => E.confirmLoop(s, Date.now()),
      () => chime("positive"),
    );

  /* ── The promise rail: every journey, always visible ── */
  const outcomes = caseOutcomes(state);
  const recoveries = finaleOutcome(state.finale);
  const railStates = (id: CaseId): Partial<Record<JourneyNode, NodeState>> => {
    const done = E.reached(state, id) && state.milestones[id] !== undefined;
    const end: NodeState = done ? (outcomes[id].use as NodeState) : "pending";
    const reachedHere = E.reached(state, id);
    return {
      ordered: reachedHere ? "clear" : "pending",
      picking: reachedHere ? (id === "milk" || id === "baking" ? (done ? "clear" : "risk") : "clear") : "pending",
      packing: reachedHere && (id === "packing" ? (done ? "clear" : "risk") : true) ? "clear" : "pending",
      handover: done ? "clear" : "pending",
      delivery: done ? "clear" : "pending",
      use: end,
    };
  };

  const protectedCount =
    CASE_IDS.filter((id) => state.milestones[id] && outcomes[id].use === "clear").length +
    (state.finale.confirmed ? Object.values(recoveries).filter((entry) => entry.protected).length : 0);

  let moment: React.ReactNode = null;
  switch (state.phase) {
    case "milk":
      moment = (
        <MilkCase state={state} time={time} onMove={moveBatch} onInspect={inspectMilk} onConfirm={confirmMilk} />
      );
      break;
    case "baking":
      moment = (
        <BakingCase
          state={state}
          time={time}
          onInspectItem={inspectItem}
          onCheckStock={checkStock}
          onCheckSubstitutes={checkSubstitutes}
          onHold={holdOrder}
          onToggleOffer={toggleOffer}
          onContact={contactCustomer}
          onDispatch={dispatchBaking}
          onCancel={cancelBaking}
          onConfirm={confirmBaking}
        />
      );
      break;
    case "packing":
      moment = (
        <PackingCase
          state={state}
          time={time}
          onMove={moveItem}
          onToggleExtra={toggleExtra}
          onInspect={inspectPacking}
          onConfirm={confirmPacking}
        />
      );
      break;
    case "batch":
      moment = (
        <BatchCase state={state} time={time} onInspectPanel={inspectBatch} onAction={batchAction} onConfirm={confirmBatch} />
      );
      break;
    case "finale":
      moment = (
        <CustomerFinale
          state={state}
          time={time}
          onOpenCustomer={openCustomer}
          onAssign={assignResource}
          onSpend={spendFund}
          onConfirm={confirmFinale}
        />
      );
      break;
    case "loop":
      moment = <CloseTheLoop state={state} time={time} onLink={linkControl} onConfirm={confirmLoop} />;
      break;
    default:
      moment = null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-obsidian">
      <header className="sticky top-0 z-30 border-b border-line bg-obsidian/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <span data-readout className="font-mono text-[14px] leading-none font-semibold text-hi tabular-nums">
            {time}
          </span>
          <CountdownPill remaining={remaining} label="remaining" />
          <span className="hidden text-[11.5px] text-faint md:inline">
            Protect the Promise · {PHASE_LABEL[state.phase] ?? ""}
          </span>
          <span className="ml-auto inline-flex items-baseline gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Protected</span>
            <span data-readout className="font-mono text-[13px] font-semibold text-ion-400 tabular-nums">
              {protectedCount}
            </span>
            <span className="font-mono text-[10px] text-faint">/ 7</span>
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-pressed={!soundEnabled}
            aria-label={soundEnabled ? "Mute sounds" : "Turn sounds on"}
            className="grid size-11 place-items-center rounded-full text-lo transition-colors hover:bg-white/[0.06] hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
          >
            {soundEnabled ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 space-y-3 p-3 sm:p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.phase}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: easing.outExpo }}
            className="rounded-card border border-line bg-surface/60 p-4 sm:p-5"
          >
            {moment}
          </motion.div>
        </AnimatePresence>

        {/* The four case journeys, always underneath — the day's own progress bar. */}
        <section aria-label="Customer promises" className="rounded-card border border-line bg-surface p-3">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Customer promises</p>
          <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {CASE_IDS.map((id) => {
              const settled = state.milestones[id] !== undefined;
              const endState: NodeState = settled ? (outcomes[id].use as NodeState) : "pending";
              return (
                <li key={id} className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <NodeMark state={endState} />
                    <span className="truncate text-[11.5px] text-mid">{INCIDENTS[id].label}</span>
                    <span
                      className={cn(
                        "ml-auto font-mono text-[9px] tracking-[0.1em] uppercase",
                        endState === "clear"
                          ? "text-ion-400"
                          : endState === "broken"
                            ? "text-alert-500"
                            : endState === "risk"
                              ? "text-warn-500"
                              : "text-faint",
                      )}
                    >
                      {settled ? outcomes[id].headline : state.phase === id ? "Open" : "Waiting"}
                    </span>
                  </div>
                  <CustomerJourney className="mt-1.5" compact states={railStates(id)} />
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
