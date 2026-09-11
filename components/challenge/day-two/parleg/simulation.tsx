"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { CorrectiveActionBoard } from "@/components/challenge/day-two/parleg/corrective-action-board";
import { InventoryFlowBoard } from "@/components/challenge/day-two/parleg/inventory-flow-board";
import { CaseOpening } from "@/components/challenge/day-two/parleg/opening";
import { PickTrace } from "@/components/challenge/day-two/parleg/pick-trace";
import { ReconciliationPanel } from "@/components/challenge/day-two/parleg/reconciliation-panel";
import { SkuComparison } from "@/components/challenge/day-two/parleg/sku-comparison";
import { SkuCountStage } from "@/components/challenge/day-two/parleg/sku-count-stage";
import { VarianceBadge } from "@/components/challenge/day-two/parleg/ui";
import { SKU_30, SKU_40, varianceOf } from "@/lib/challenge/day-two/parleg/content";
import {
  applyScanFilter,
  beginCount,
  clearSlot,
  commitActions,
  confirmShelf,
  correctWithoutCause,
  countRow,
  guessPick,
  linkVariances,
  openEvidence,
  pgSnapshot,
  placeCard,
  placeNode,
  reconcile,
  scanLocation,
  startActions,
  startFlow,
  startTrace,
} from "@/lib/challenge/day-two/parleg/engine";
import type {
  FlowNodeId,
  FlowSlotId,
  ParleGState,
  PgEvidence,
  PgLane,
  PgSku,
  PgStage,
} from "@/lib/challenge/day-two/parleg/types";
import { logEvent, type ChallengeEventName } from "@/lib/challenge/telemetry";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type PgApply = (
  fn: (state: ParleGState) => ParleGState,
  after?: (prev: ParleGState, next: ParleGState) => void,
) => void;

const STAGE_NAMES = ["Spot", "Trace", "Solve", "Correct"] as const;

function stageIndex(stage: PgStage): number {
  if (stage === "trace") return 1;
  if (stage === "flow") return 2;
  if (stage === "actions" || stage === "reconcile" || stage === "done") return 3;
  return 0;
}

/**
 * Case 02 — Parle-G SKU drift.
 *
 * State lives with the Day 2 orchestrator, which owns the clock and has to be
 * able to close this case when time runs out; this component is its view and
 * its telemetry. Every handler emits exactly once, after the transition, with
 * the state on either side of it.
 */
export function ParleGSimulation({
  state,
  apply,
  clock,
  sound,
  onReturn,
}: {
  state: ParleGState;
  apply: PgApply;
  clock: string;
  sound: (kind: "scan" | "found" | "done") => void;
  onReturn: () => void;
}) {
  const reduced = useReducedMotion();

  const log = (name: ChallengeEventName, prev: ParleGState, next: ParleGState, action?: string) =>
    logEvent(
      name,
      {
        case: "parleg",
        stage: prev.stage,
        action,
        before: pgSnapshot(prev),
        after: pgSnapshot(next),
        signals: next.signals,
        tags: next.tags,
      },
      2,
    );

  /* ── Handlers ── */

  const onBegin = () => apply(beginCount);

  const onScan = (sku: PgSku) =>
    apply(
      (s) => scanLocation(s, sku),
      (prev, next) => {
        if (next === prev) return;
        log(sku === "sku30" ? "sku30_scanned" : "sku40_scanned", prev, next, sku);
        sound("scan");
      },
    );

  const onCountRow = (sku: PgSku, row: number) =>
    apply(
      (s) => countRow(s, sku, row),
      (prev, next) => {
        if (next !== prev) sound("scan");
      },
    );

  const onConfirm = (sku: PgSku) =>
    apply(
      (s) => confirmShelf(s, sku, Date.now()),
      (prev, next) => {
        if (next === prev) return;
        log(sku === "sku30" ? "sku30_count_confirmed" : "sku40_count_confirmed", prev, next, sku);
      },
    );

  const onLink = (a: string, b: string) =>
    apply(
      (s) => linkVariances(s, a, b, Date.now()),
      (prev, next) => {
        if (next.linked && !prev.linked) {
          log("mirrored_variance_seen", prev, next, `${a}+${b}`);
          sound("found");
        }
      },
    );

  const onCorrectNow = () =>
    apply(correctWithoutCause, (prev, next) => {
      if (next !== prev) log("corrective_action_assigned", prev, next, "correct_without_cause");
    });

  const onOpenEvidence = (kind: PgEvidence) =>
    apply(
      (s) => openEvidence(s, kind),
      (prev, next) => {
        if (next === prev) return;
        log(
          kind === "orders" ? "orders_opened" : kind === "scans" ? "scan_log_opened" : "pick_replay_opened",
          prev,
          next,
          kind,
        );
      },
    );

  const onFilter = () =>
    apply(applyScanFilter, (prev, next) => {
      if (next !== prev) sound("found");
    });

  const onGuess = (sku: PgSku) =>
    apply(
      (s) => guessPick(s, sku),
      (prev, next) => {
        if (next.mismatchFound && !prev.mismatchFound) {
          log("wrong_product_identified", prev, next, sku);
          sound("found");
        }
      },
    );

  const onPlaceNode = (node: FlowNodeId, slot: FlowSlotId) =>
    apply(
      (s) => placeNode(s, node, slot),
      (prev, next) => {
        if (next === prev) return;
        log("causal_connection_created", prev, next, `${node}->${slot}`);
        if (next.flowSolved && !prev.flowSolved) {
          log("root_cause_identified", prev, next);
          sound("found");
        }
      },
    );

  const onPlaceCard = (cardId: string, lane: PgLane | null) =>
    apply(
      (s) => placeCard(s, cardId, lane),
      (prev, next) => {
        if (next !== prev) log("corrective_action_assigned", prev, next, `${cardId}:${lane ?? "none"}`);
      },
    );

  const onCommit = () =>
    apply(commitActions, (prev, next) => {
      if (next !== prev) log("reconciliation_started", prev, next);
    });

  const onReconcile = () =>
    apply(
      (s) => reconcile(s, Date.now()),
      (prev, next) => {
        if (next === prev) return;
        log("reconciliation_completed", prev, next);
        sound("done");
      },
    );

  /* ── View ── */

  const counted = state.confirmed.sku30 && state.confirmed.sku40;
  const current = stageIndex(state.stage);

  return (
    <div className="space-y-4">
      {/* Case bar. Sticky, so the +17 / −17 stays in view once it is known. */}
      <div className="sticky top-12 z-20 -mx-3 border-b border-line bg-obsidian/92 px-3 py-2 backdrop-blur-md lg:mx-0 lg:rounded-card lg:border lg:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="font-mono text-[10px] tracking-[0.16em] text-warn-500 uppercase">
            Case 02 · SKU drift
          </p>
          {state.stage !== "opening" ? (
            <ol className="flex items-center gap-1.5" aria-label="Case stages">
              {STAGE_NAMES.map((name, index) => (
                <li key={name} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      index < current ? "bg-ion-400" : index === current ? "bg-ember-500" : "bg-white/15",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "hidden text-[10.5px] sm:inline",
                      index === current ? "text-hi" : "text-faint",
                    )}
                    aria-current={index === current ? "step" : undefined}
                  >
                    {name}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          {counted ? (
            <span className="ml-auto flex items-center gap-2 font-mono text-[11.5px] text-mid">
              {SKU_30.weight}
              <VarianceBadge value={varianceOf(SKU_30)} />
              <span className="text-faint">|</span>
              {SKU_40.weight}
              <VarianceBadge value={varianceOf(SKU_40)} />
            </span>
          ) : null}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={state.stage}
          initial={reduced ? false : { y: 8 }}
          animate={{ y: 0 }}
          exit={reduced ? undefined : { y: -4 }}
          transition={{ duration: 0.22, ease: easing.outExpo }}
        >
          {state.stage === "opening" ? (
            <CaseOpening clock={clock} onBegin={onBegin} />
          ) : state.stage === "count" ? (
            <SkuCountStage
              state={state}
              onScan={onScan}
              onCountRow={onCountRow}
              onConfirm={onConfirm}
            />
          ) : state.stage === "pattern" ? (
            <SkuComparison
              state={state}
              onLink={onLink}
              onTrace={() => apply(startTrace)}
              onCorrectNow={onCorrectNow}
            />
          ) : state.stage === "trace" ? (
            <PickTrace
              state={state}
              onOpen={onOpenEvidence}
              onFilter={onFilter}
              onGuess={onGuess}
              onContinue={() => apply(startFlow)}
            />
          ) : state.stage === "flow" ? (
            <InventoryFlowBoard
              state={state}
              onPlace={onPlaceNode}
              onClear={(slot) => apply((s) => clearSlot(s, slot))}
              onContinue={() => apply(startActions)}
            />
          ) : state.stage === "actions" ? (
            <CorrectiveActionBoard state={state} onPlace={onPlaceCard} onCommit={onCommit} />
          ) : (
            <ReconciliationPanel state={state} onReconcile={onReconcile} onReturn={onReturn} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
