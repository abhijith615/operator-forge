import type {
  Bucket,
  SheetToolId,
  DockId,
  EvidenceId,
  GateCheckId,
  JobId,
  NoticeId,
  PeakItemId,
  PersonId,
  TaskId,
  VehicleId,
} from "./content";

/**
 * The FC Executive shift, as data.
 *
 * Like the store-manager test, only the candidate's actions are stored. The
 * state is what the engine makes of them, so the server can replay any
 * attempt and score it exactly as it was played.
 */

export type SceneId = "handover" | "plan" | "replan" | "receive" | "discrepancy" | "data" | "peak" | "outcome" | "done";

export const SCENES: SceneId[] = ["handover", "plan", "replan", "receive", "discrepancy", "data", "peak", "outcome", "done"];

/** When each scene starts on the shift clock (minutes after 07:00). */
export const SCHEDULE: Record<SceneId, number> = {
  handover: 0,
  plan: 10,
  replan: 45,
  receive: 120,
  discrepancy: 180,
  data: 240,
  peak: 270,
  outcome: 300,
  done: 300,
};

export interface Placement {
  dock: DockId;
  start: number;
}

/** Somebody to do a job: a team member's id, or "me". */
export type Owner = PersonId | "me";

export type CountChoice = "recount" | "close" | "invoice" | "driver";
export type QcDecision = "rejectNoted" | "reject" | "acceptAll" | "holdAll";
export type PutawayChoice = "split" | "allCold" | "dockAside" | "ambient";
export type ReceiveStep = "unload" | "count" | "qc" | "grn" | "putaway";

export type Action =
  | { t: "view"; panel: string }
  | { t: "continue" }
  | { t: "place"; v: VehicleId; dock: DockId; start: number }
  | { t: "unplace"; v: VehicleId }
  | { t: "lockPlan" }
  | { t: "assign"; p: PersonId; task: TaskId }
  | { t: "lockTeam" }
  | { t: "quickbev"; choice: "board" | "offpeak" | "turnaway" }
  | { t: "notify"; on: boolean }
  | { t: "notice"; choice: NoticeId }
  | { t: "lockReplan" }
  | { t: "gateCheck"; id: GateCheckId }
  | { t: "unload" }
  | { t: "count"; choice: CountChoice; owner?: Owner }
  | { t: "qcCheck"; owner: Owner }
  | { t: "qcDecide"; choice: QcDecision }
  | { t: "grn"; qty: number; owner: Owner }
  | { t: "putaway"; choice: PutawayChoice }
  | { t: "closeReceipt" }
  | { t: "evidence"; id: EvidenceId }
  | { t: "recountPallet"; owner: Owner }
  | {
      t: "classify";
      short: number;
      damaged: number;
      unscannable: number;
      damagedFate: "rtv" | "scrap" | "accept";
      unscanFate: "relabel" | "reject" | "short";
      relabelOwner?: Owner;
      cause: "vendorStacking" | "ourUnloading" | "transport" | "unsure";
      prevent: "gateCheck" | "review" | "remind" | "nothing";
    }
  | { t: "sheetTool"; id: SheetToolId }
  | { t: "removeDuplicate" }
  | { t: "flagRow"; id: string }
  | { t: "signals"; picks: string[] }
  | { t: "driver"; id: string }
  | { t: "report"; lines: string[]; sendAnyway?: boolean }
  | { t: "escalate"; id: string }
  | { t: "peakPlan"; buckets: Record<PeakItemId, Bucket> }
  | { t: "vendorReply"; id: string }
  | { t: "procurement"; id: string }
  | { t: "finish" };

export interface Stamped {
  a: Action;
  /** Milliseconds since the attempt started, on the server's clock. */
  at: number;
}

export interface LogEntry {
  seq: number;
  scene: SceneId;
  eventType: string;
  realMs: number;
  simTime: number;
  action: Action;
}

/** A job the candidate did personally. Counted for delegation. */
export interface Personal {
  job: JobId;
  at: number;
}

/** A job given to somebody, and whether they were the right person for it. */
export interface Handed {
  job: JobId;
  to: PersonId;
  suited: boolean;
}

export interface FcState {
  scene: SceneId;
  /** Shift minutes after 07:00. */
  clock: number;
  seq: number;
  log: LogEntry[];
  /** Real ms when each scene was first reached. */
  reachedAt: Partial<Record<SceneId, number>>;
  /** Time ran out while this scene was open. */
  expiredIn: SceneId | null;

  viewed: string[];

  board: Partial<Record<VehicleId, Placement>>;
  /** The board as locked at 07:10, before anything changed. */
  initialPlan: Partial<Record<VehicleId, Placement>> | null;
  /** Peak trucks unloading at once in the plan the team was staffed for. */
  plannedPeak: number;
  team: Record<PersonId, TaskId>;
  teamLocked: boolean;
  /** Trucks knocked off the board by the 07:45 update. */
  bumped: VehicleId[];
  quickbev: "board" | "offpeak" | "turnaway" | null;
  notified: boolean;
  /** What the vendors were told after the replan. */
  notice: NoticeId | null;
  /** The board as locked after the 07:45 update. */
  finalPlan: Partial<Record<VehicleId, Placement>> | null;

  receive: {
    /** Gate checks, with the order they happened in relative to the other steps. */
    checks: Partial<Record<GateCheckId, number>>;
    /** Steps done, in order, with the step counter when each happened. */
    steps: Partial<Record<ReceiveStep, number>>;
    step: number;
    count: { choice: CountChoice; owner?: Owner; asked: boolean } | null;
    /** The crate count is settled at 240. */
    reconciled: boolean;
    qc: { owner: Owner; decision: QcDecision | null } | null;
    grn: { qty: number; owner: Owner; afterQc: boolean; reconciled: boolean } | null;
    putaway: PutawayChoice | null;
    closed: boolean;
  };

  disc: {
    evidence: EvidenceId[];
    recount: Owner | null;
    decision: Extract<Action, { t: "classify" }> | null;
  };

  data: {
    tools: SheetToolId[];
    /** Rows the candidate flagged by eye. Each uses one of the checks. */
    flags: string[];
    deduped: boolean;
    /** The duplicate was removed only after the send-time warning. */
    dedupedAfterPrompt: boolean;
    prompted: boolean;
    signals: string[] | null;
    driver: string | null;
    report: { lines: string[]; inconsistent: boolean } | null;
    escalation: string | null;
  };

  peak: {
    buckets: Record<PeakItemId, Bucket> | null;
    vendorReply: string | null;
    procurement: string | null;
  };

  personal: Personal[];
  handed: Handed[];
}
