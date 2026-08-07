/**
 * The invisible layer. Nothing here is ever shown during a shift — it exists so
 * the debrief can describe what the operator actually did rather than what they
 * remember doing.
 */

export type TelemetryKind =
  /** Moved to a different panel. */
  | "navigate"
  /** Left a panel — carries how long they were on it. */
  | "dwell"
  /** Sent a message to a colleague or the copilot. */
  | "prompt"
  /** Opened a glossary term. */
  | "term"
  /** Pressed an option on a task. Mirrors the decision record. */
  | "decide"
  /** Used a control on a floor panel. */
  | "control"
  /** Tab hidden or shown. */
  | "focus";

export interface TelemetryEvent {
  id: string;
  /** Elapsed mission seconds. */
  at: number;
  kind: TelemetryKind;
  /** Route, term id, agent id, control name. */
  target: string;
  /** Seconds, for `dwell`. Characters, for `prompt`. */
  value?: number;
  meta?: Record<string, string | number | boolean>;
}

/** Periodic snapshot of the floor, for the replay and the trend lines. */
export interface WorldTrace {
  at: number;
  rating: number;
  otif: number;
  openOrders: number;
  pendingTasks: number;
  activeWorkers: number;
  breached: number;
}
