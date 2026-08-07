import type { CapabilityId } from "@/lib/constants/site";
import type { WorldEffect } from "@/lib/mission/effects";

/** The four things a hub supervisor is holding at once. */
export type TaskStream = "operations" | "people" | "customers" | "management";

export type TaskPriority = "critical" | "high" | "normal";

export type TaskStatus = "pending" | "resolved" | "expired";

/**
 * One choice on a task. `quality` is the scoring signal — 0 is a genuinely poor
 * call, 1 is what a strong operator does — and `capabilities` says which of the
 * ten this choice is evidence for. Phase 3 reads both; the operator never sees
 * either.
 */
export interface TaskOption {
  id: string;
  label: string;
  /** One line shown after the choice, never before. No spoilers. */
  outcome: string;
  quality: number;
  capabilities: CapabilityId[];
  /** Serialisable consequences — see `lib/mission/effects.ts`. */
  effects?: WorldEffect[];
  /** Template ids to queue as a direct consequence of choosing this. */
  cascades?: string[];
}

export interface MissionTask {
  id: string;
  templateId: string;
  stream: TaskStream;
  priority: TaskPriority;
  title: string;
  detail: string;
  /** Who raised it — a name, a system, a customer. */
  source: string;
  /** Worker, rider or order this task is about. Keeps two tasks off one person. */
  subjectId?: string;
  /** Elapsed mission seconds when it landed. */
  createdAt: number;
  /** Elapsed seconds at which it expires. `null` means it waits forever. */
  expiresAt: number | null;
  options: TaskOption[];
  status: TaskStatus;
  resolvedAt?: number;
  resolvedOptionId?: string;
}

/**
 * The record of a single call. This is the raw material the Operator Genome is
 * built from, so it captures not just what was chosen but how long it took and
 * what was on the queue at the time.
 */
export interface TaskDecision {
  taskId: string;
  templateId: string;
  stream: TaskStream;
  priority: TaskPriority;
  /** Elapsed seconds when the decision was made, or when it expired. */
  at: number;
  /** Seconds between the task landing and the operator acting. */
  latency: number;
  optionId: string | null;
  optionLabel: string | null;
  quality: number;
  capabilities: CapabilityId[];
  expired: boolean;
  /** How many other tasks were pending at that moment. */
  queueDepth: number;
}

export interface Achievement {
  id: string;
  name: string;
  blurb: string;
  at: number;
}
