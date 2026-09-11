"use client";

import type { ChallengeResult, DecisionRecord, SimulationState } from "./types";

/**
 * Event log and local persistence.
 *
 * There is no analytics service in this project yet, so this is the seam where
 * one attaches: everything the simulation wants to report goes through
 * `logEvent`, which buffers in memory and mirrors to localStorage. Swapping in
 * a real sink later is a change to one function.
 */

export type ChallengeEventName =
  | "simulation_started"
  | "floor_assignment_confirmed"
  | "packing_intervention_selected"
  | "nil_pick_location_checked"
  | "nil_pick_resolution_selected"
  | "sop_viewed"
  | "packing_configuration_submitted"
  | "dispatch_action_selected"
  | "recovery_action_selected"
  | "recovery_plan_executed"
  | "simulation_completed"
  | "scorecard_viewed"
  /* ── Day 2 · inventory forensics ── */
  | "day2_started"
  | "earbuds_case_opened"
  | "physical_count_started"
  | "physical_unit_counted"
  | "physical_count_confirmed"
  | "investigation_tool_opened"
  | "movement_log_viewed"
  | "order_trace_opened"
  | "missing_scan_discovered"
  | "evidence_added"
  | "access_log_viewed"
  | "cctv_opened"
  | "cctv_timestamp_viewed"
  | "process_variance_confirmed"
  | "exception_area_checked"
  | "cancelled_order_found"
  | "stock_recovered"
  | "hypothesis_created"
  | "premature_theft_assumption"
  | "action_board_completed"
  | "earbuds_reconciliation_signed"
  | "earbuds_case_completed"
  | "day2_timed_out";

export interface ChallengeEvent {
  name: ChallengeEventName;
  at: number;
  day: number;
  payload: Record<string, unknown>;
}

const EVENT_KEY = "of.challenge.events";
const RESULT_KEY = "of.challenge.day1";
const MAX_EVENTS = 300;

let buffer: ChallengeEvent[] = [];

/** Replace this body to send somewhere real. Everything else stays put. */
function sink(event: ChallengeEvent): void {
  buffer = [...buffer, event].slice(-MAX_EVENTS);
  try {
    window.localStorage.setItem(EVENT_KEY, JSON.stringify(buffer));
  } catch {
    // Storage unavailable — the simulation does not depend on it.
  }
}

export function logEvent(
  name: ChallengeEventName,
  payload: Record<string, unknown> = {},
  day = 1,
): void {
  if (typeof window === "undefined") return;
  sink({ name, at: Date.now(), day, payload });
}

/** The full shape the spec asks to record for every decision. */
export function logDecision(record: DecisionRecord, name: ChallengeEventName): void {
  logEvent(name, {
    scene: record.scene,
    decisionId: record.decisionId,
    chosenAction: record.chosenAction,
    simulatedTime: record.simulatedTime,
    elapsedMs: record.at,
    stateBefore: record.metricsBefore,
    stateAfter: record.metricsAfter,
    behaviouralSignals: record.signals,
    sopImpact: record.sopImpact,
    tags: record.tags,
  });
}

export function readEvents(): ChallengeEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENT_KEY);
    return raw ? (JSON.parse(raw) as ChallengeEvent[]) : [];
  } catch {
    return [];
  }
}

/* ── Completion record ────────────────────────────────────────────────── */

export interface StoredDay {
  day: number;
  completedAt: string;
  score: number;
  band: string;
  signature: string;
  competencies: Record<string, number>;
  decisions: { scene: string; action: string }[];
}

export function saveCompletion(state: SimulationState, result: ChallengeResult): void {
  if (typeof window === "undefined") return;
  const stored: StoredDay = {
    day: 1,
    completedAt: new Date().toISOString(),
    score: result.score,
    band: result.band,
    signature: result.signature.name,
    competencies: Object.fromEntries(
      result.competencies.map((entry) => [entry.dimension, entry.score]),
    ),
    decisions: state.decisions.map((decision) => ({
      scene: decision.scene,
      action: decision.chosenAction,
    })),
  };
  try {
    window.localStorage.setItem(RESULT_KEY, JSON.stringify(stored));
  } catch {
    /* Nothing to do — the scorecard is on screen regardless. */
  }
}

export function readCompletion(): StoredDay | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as StoredDay) : null;
  } catch {
    return null;
  }
}
