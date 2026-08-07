import type { WorldState } from "./world";

export type RunStatus = "briefing" | "live" | "complete" | "abandoned";

/** Anything worth putting on the operator's record, in order. */
export type TimelineKind = "event" | "action" | "system" | "message";

export type TimelineTone = "neutral" | "positive" | "warning" | "critical" | "info";

export interface TimelineEntry {
  id: string;
  /** Elapsed mission seconds. */
  at: number;
  kind: TimelineKind;
  tone: TimelineTone;
  title: string;
  detail?: string;
  /** Which panel this belongs to, for filtering and for the Phase 3 replay. */
  source?: "orders" | "people" | "inventory" | "customers" | "hub" | "messages";
}

export interface MissionNotification {
  id: string;
  at: number;
  tone: TimelineTone;
  title: string;
  body: string;
  /** Panel to open when the operator acts on it. */
  href?: string;
  actionLabel?: string;
}

export interface MissionRun {
  id: string;
  operatorId: string;
  missionId: string;
  status: RunStatus;
  /** Epoch ms. The clock is derived from this, so a refresh never rewinds it. */
  startedAt: number;
  endsAt: number;
  completedAt: number | null;
  world: WorldState;
  timeline: TimelineEntry[];
  /** Indexes of the event schedule already fired. */
  firedEvents: string[];
}

/** What the operator did, distinct from what happened to them. */
export type OperatorActionType =
  | "expedite-order"
  | "cancel-order"
  | "reassign-worker"
  | "grant-break"
  | "recall-worker"
  | "cycle-count"
  | "block-sku"
  | "request-replenishment"
  | "resolve-complaint"
  | "set-store-status"
  | "clear-impairment";
