import type { ParlegDimension } from "../types";

/**
 * Case 02 — Parle-G SKU drift.
 *
 * Case 01 was forensics: which record explains which unit. This one is a
 * pattern: two numbers that are each wrong in a way that only makes sense
 * once you see them together. The state is shaped around the four things the
 * learner does — count, trace, explain, correct — rather than around screens.
 */

export type PgSku = "sku30" | "sku40";

export type PgEvidence = "orders" | "scans" | "replay";

export type PgLane = "fixNow" | "preventRepeat" | "notNeeded";

export type FlowNodeId = "gap" | "wrongPick" | "sysDeduct" | "physLeave";

export type FlowSlotId = "control" | "event" | "sku30Effect" | "sku40Effect";

export type PgStage =
  | "unopened"
  | "opening"
  | "count"
  | "pattern"
  | "trace"
  | "flow"
  | "actions"
  | "reconcile"
  | "done";

/** The brief's tags, plus the few the interaction model needs to be honest. */
export type PgTag =
  | "both_skus_verified"
  | "mirrored_variance_recognised"
  | "order_history_checked"
  | "scan_gap_identified"
  | "pick_replay_checked"
  | "wrong_size_pick_identified"
  | "inventory_flow_understood"
  | "financial_impact_understood"
  | "record_impact_understood"
  | "both_skus_reconciled"
  | "shelf_separation_selected"
  | "scan_control_selected"
  | "targeted_coaching_selected"
  | "unnecessary_store_shutdown"
  | "unnecessary_catalogue_removal"
  | "blind_writeoff"
  | "whole_store_recount_overreaction"
  /* ── beyond the brief ── */
  | "corrected_without_cause"
  | "flow_needed_retries"
  | "worked_highest_exposure_first"
  | "worked_lower_exposure_first"
  | "case_timed_out"
  | "case_left_open";

export type PgSignals = Record<ParlegDimension, number>;
export type PgSignalDelta = Partial<PgSignals>;

export interface PgActionCard {
  id: string;
  label: string;
  detail: string;
  /** Signal per lane. A lane that is absent earns nothing either way. */
  score: Partial<Record<PgLane, PgSignalDelta>>;
  /** Tags earned by placing the card in a given lane. */
  tags?: Partial<Record<PgLane, PgTag[]>>;
}

export interface ParleGState {
  stage: PgStage;

  /* Stage 1 — count */
  locationScanned: Record<PgSku, boolean>;
  countedRows: Record<PgSku, number[]>;
  confirmed: Record<PgSku, boolean>;
  /** When the second shelf was confirmed — the clock for pattern speed. */
  countsConfirmedAt: number | null;
  linkAttempts: number;
  linked: boolean;

  /* Stage 2 — trace */
  evidenceOpened: PgEvidence[];
  scanFilterApplied: boolean;
  replayGuesses: PgSku[];
  mismatchFound: boolean;

  /* Stage 3 — flow */
  placements: Record<FlowSlotId, FlowNodeId | null>;
  /** Slots the last full placement put the wrong node in. Cleared on the next move. */
  rejectedSlots: FlowSlotId[];
  flowAttempts: number;
  flowSolved: boolean;

  /* Stage 4 — correct & prevent */
  actions: Record<PgLane, string[]>;

  reconciled: boolean;

  signals: PgSignals;
  tags: PgTag[];
  startedAt: number | null;
  completedAt: number | null;
}
