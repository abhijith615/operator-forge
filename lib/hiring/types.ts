import type { CompetencyId } from "./weights";

/**
 * The Hiring Test's shared vocabulary.
 *
 * Everything the candidate does is an `Action`. The engine is a pure function
 * from a list of actions to a `HiringState`, and the scorer is a pure function
 * from that state to a result. Nothing is scored on the browser's say-so: the
 * server replays the same actions through the same engine, so the only thing a
 * candidate can send that changes their result is a different decision.
 */

export type FormId = "A" | "B" | "C";
/**
 * The three things people do on the floor. Picking includes packing the order
 * and staging it for a rider: there is no separate packing bench.
 */
export type Station = "picking" | "putaway" | "auditing";
export const STATIONS: Station[] = ["picking", "putaway", "auditing"];

/**
 * A place the store can get stuck. The three workflows, and the riders — who
 * are not the manager's to stand anywhere, only to count, call in and sequence.
 */
export type Stage = Station | "riders";
export const STAGES: Stage[] = ["picking", "putaway", "auditing", "riders"];

export type SceneId =
  | "handover"
  | "floor"
  | "absence"
  | "riya"
  | "arjun"
  | "case"
  | "nilpick"
  | "triage"
  | "bottleneck"
  | "customer"
  | "final"
  | "outcome"
  | "done";

/** "me" is the manager; anything else is an employee id. */
export type Owner = "me" | string;

export interface Employee {
  id: string;
  name: string;
  /** What the roster card says they are. */
  title: string;
  /** Productivity at each station, where 1.0 is a competent full-time hand. */
  skills: Record<Station, number>;
  auth: { highValue: boolean; audit: boolean; riders: boolean; inwarding: boolean };
  tenure: string;
  /** 0–1. Reduces output. */
  fatigue: number;
  /** A line a manager would actually know about them. */
  note: string;
  stats?: { label: string; value: string }[];
}

/* ── Actions ──────────────────────────────────────────────────────────── */

export type RiyaChoice =
  | "lockPutaway"
  | "pair"
  | "phaseLater"
  | "keep"
  | "target"
  | "returnAgency"
  | "warn";

export type AbsenceChoice = "onDemand" | "reallocate" | "extend" | "short";

export type UnitCall = "explained" | "recovered" | "unresolved" | "writeoff" | "theft";
export type CaseStep = "preserve" | "controlAccess" | "escalate" | "accuse" | "writeOff" | "closeStore";
export type ControlFix = "scanAtIssue" | "exceptionRestow" | "remindTeam" | "fullAudit";

export type TriageMode = "handle" | "delegate" | "later";
export interface TriageCall {
  mode: TriageMode;
  owner?: string;
}

export type Intervention =
  | { kind: "move"; emp: string; to: Station }
  /** Lock a device to its role, or unlock it so the app can send it orders in a spike. */
  | { kind: "lock"; emp: string; locked: boolean }
  /** A process change at one stage: fast lines first, batching riders by lane, pausing the count. */
  | { kind: "addSlot"; station: Stage }
  /** Put somebody on the handover point to sequence riders. */
  | { kind: "riderDesk"; emp: string }
  /** Call the standby riders in. */
  | { kind: "standby" }
  | { kind: "clearAisle"; owner: Owner }
  | { kind: "slowRelease" };

export type Bucket = "now" | "delegate" | "later";
export type LateOrderFix = "informPriority" | "voucher" | "cancel";

export type ArjunResponse = {
  t: "arjunRespond";
  ack: "recognise" | "neutral" | "dismiss";
  clarify: "verified" | "willCheck" | "guess" | "deflect" | "promise";
  request: "respectful" | "order" | "threat" | "none";
};

export type DispositionAction = {
  t: "disposition";
  units: [UnitCall, UnitCall, UnitCall];
  steps: CaseStep[];
  controls: ControlFix[];
};

export type TriageAction = {
  t: "triage";
  constraint: TriageCall;
  aisle: TriageCall;
  followUp: TriageCall;
};

export type PlanEntry = { bucket: Bucket; owner?: string; fix?: LateOrderFix };
export type PlanAction = { t: "plan"; tasks: Record<string, PlanEntry> };

export type Action =
  | { t: "inspect"; item: string }
  | { t: "takeShift" }
  | { t: "assign"; emp: string; to: Station }
  /** The device lock: locked to the role, or unlocked and open to orders in a spike. */
  | { t: "lock"; emp: string; locked: boolean }
  /** Ask the rider partner for the two standby riders, or stand them down. */
  | { t: "standby"; on: boolean }
  | { t: "lockFloor" }
  | { t: "absence"; choices: AbsenceChoice[] }
  | { t: "riya"; choices: RiyaChoice[] }
  | { t: "arjunPlace"; place: "here" | "aside" }
  | ArjunResponse
  | { t: "startCount"; owner: Owner }
  | { t: "deferCase" }
  | { t: "pullRecords"; owner: string }
  | { t: "caseInterrupt"; choice: "stay" | "handOver" | "stepOut"; owner?: string; move?: string }
  | { t: "wait" }
  | DispositionAction
  | { t: "nilSearch"; owner: Owner }
  | { t: "nilResolve"; how: "replenish" | "authorise" | "delist" | "ignore"; owner?: string }
  | TriageAction
  /** "holding" is the answer that nothing is stuck. */
  | { t: "floorLeadReply"; call: Stage | "aisle" | "unsure" | "holding" }
  | { t: "intervene"; moves: Intervention[] }
  | { t: "runSystem" }
  | { t: "bag"; cleanerBag: 1 | 2; cleanerLiner: boolean; by: Owner | "unchanged" }
  | PlanAction
  | { t: "next" };

/** What actually gets stored and replayed: the action, and when it was taken. */
export interface Stamped {
  a: Action;
  /** Milliseconds since the candidate pressed Start. Never used for scoring. */
  at: number;
}

/* ── State ────────────────────────────────────────────────────────────── */

export interface Metrics {
  ordersWaiting: number;
  /** Packed bags on the staging shelf, waiting for a rider. */
  staged: number;
  ctd: number;
  /** Seconds an item is taking to pick across the floor right now. Target 16. */
  ppi: number;
  /** Share of their time the unlocked devices are spending on orders, 0–1. */
  pull: number;
  coverage: Record<Stage, number>;
}

export interface Delegation {
  task: string;
  label: string;
  owner: string;
  /** 0–1 against the best person for it. */
  fit: number;
  appropriate: boolean;
  at: number;
  scene: SceneId;
}

export interface PersonalWork {
  task: string;
  label: string;
  /** Could somebody on the floor have done this? */
  delegable: boolean;
  /** Was a well-suited person free when the manager did it instead? */
  fitAvailable: boolean;
  at: number;
  scene: SceneId;
}

export interface FinalTask {
  id: string;
  title: string;
  detail: string;
  /** Whether it cannot safely wait for the peak to pass. */
  urgent: boolean;
  /** Needs the manager's own judgement rather than a pair of hands. */
  managerLevel: boolean;
  /** Which kind of work it is, for judging who suits it. */
  kind: TaskKind | null;
}

export type TaskKind =
  | "count"
  | "records"
  | "search"
  | "replenish"
  | "aisle"
  | "repack"
  | "followUp"
  | "riders"
  | "lateOrder"
  | "inbound"
  | "audit"
  | "perishables"
  | "coaching";

export interface LogEntry {
  seq: number;
  realMs: number;
  /** Store time when the action was taken, and when it had finished. */
  simTime: number;
  simAfter: number;
  scene: SceneId;
  eventType: string;
  entityId?: string;
  action: Action;
  before: Metrics;
  after: Metrics;
  tags: string[];
}

export interface HiringState {
  form: FormId;
  scene: SceneId;
  /** Simulated seconds since 05:55:00. */
  clock: number;
  /**
   * Set when the thirty minutes ended before the plan was locked: where the
   * candidate was, and how the store stood at that moment. Everything after it
   * is the store running on with nobody deciding, and is not theirs.
   */
  expiry: { scene: SceneId; clock: number; maxCtd: number; firstBreachAt: number | null } | null;
  /** When the candidate actually reached each part of the shift. */
  arrivals: Partial<Record<SceneId, number>>;

  assign: Record<string, Station>;
  /** Devices locked to their role. Anybody on putaway or auditing who is not here is unlocked. */
  locks: Record<string, boolean>;
  busy: Record<string, { until: number; task: string }>;
  riders: {
    /** Logged in at the start of the shift, of nine rostered. */
    on: number;
    standby: boolean;
    standbyAt: number | null;
    /** Whoever is sequencing riders at the handover point. */
    desk: string | null;
  };
  /** The morning perishables check: work done so far, and when it finished. */
  audit: { progress: number; doneAt: number | null };
  flow: { pickQ: number; stageQ: number };
  trace: { t: number; ctd: number; staged: number; ordersWaiting: number }[];
  maxCtd: number;
  firstBreachAt: number | null;

  shocks: {
    /** Null while Aisle C is still blocked. */
    aisleClearedAt: number | null;
    slowReleaseUntil: number;
    /** Stages where a process change has taken some of the load off. */
    lanes: Stage[];
    managerOnBenchUntil: number;
    inboundCleared: boolean;
    riders: "normal" | "sequenced" | "gap";
    /** Seconds the app spent protecting the store by lengthening its promise. */
    extended: number;
    /** Orders the app turned away because the store could not take them. */
    shed: number;
  };
  followUp: "open" | "done" | "delegated";

  trust: number;
  cost: number;
  handover: string[];

  floor: {
    lockedAt: number;
    projected: Record<Stage, number>;
    fit: number;
    reserve: string[];
    uncovered: Station[];
  } | null;
  absence: {
    choices: AbsenceChoice[];
    projectedMin: number;
    pickingProjected: number;
    at: number;
  } | null;
  tempArrivesAt: number | null;

  riya: {
    inspected: boolean;
    choices: RiyaChoice[] | null;
    pairUntil: number;
    pairPartner: string | null;
    /** When she walked out, if she did. */
    leftAt: number | null;
  };
  arjun: {
    place: "here" | "aside" | null;
    checked: string[];
    response: ArjunResponse | null;
    outcome: "pending" | "willing" | "reluctant" | "resentful" | "leaving";
    unsupportedPromise: boolean;
  };

  kase: {
    stage: "alert" | "open" | "closed" | "deferred";
    firstMove: "count" | "records" | "defer" | null;
    countOwner: Owner | null;
    countDoneAt: number | null;
    viewed: string[];
    recordsOwner: string | null;
    recordsDoneAt: number | null;
    interrupt: { choice: string; at: number; ordersWaiting: number; ctd: number } | null;
    disposition: DispositionAction | null;
    openedAt: number;
  };

  nil: {
    viewed: string[];
    searchOwner: Owner | null;
    searchDoneAt: number | null;
    outcome: "replenished" | "authorised" | "delisted" | "ignored" | null;
    searchedBefore: boolean;
  };

  triage: TriageAction | null;
  /** The board as it stood when the three problems landed. */
  triageAt: Metrics | null;

  bn: {
    coverageAtStart: Record<Stage, number> | null;
    constraintAtStart: Stage | null;
    /** The workflow the Floor Lead blames. It is never the one that is stuck. */
    blamed: Station | null;
    /** Where each person moved at the bottleneck was standing beforehand. */
    origins: Record<string, Station>;
    viewed: string[];
    viewedBeforeAct: string[];
    reply: string | null;
    moves: Intervention[];
    ranAt: number | null;
    before: Metrics | null;
    after: Metrics | null;
    effectChecked: boolean;
  };

  bag: {
    cleanerBag: 1 | 2;
    cleanerLiner: boolean;
    by: Owner | "unchanged";
    ctdBefore: number;
    ctdAfter: number;
    at: number;
  } | null;

  tasksOffered: FinalTask[];
  plan: Record<string, PlanEntry> | null;
  teamAtFinal: { id: string; where: string; load: number }[];

  outcome: {
    title: string;
    events: { clock: number; text: string; tone: "good" | "warn" | "bad" | "neutral" }[];
    finalCtd: number;
    peakCoverage: number;
    /** Her putaway rate against a trained hand, ten minutes into the peak. Zero if she was not on it. */
    riyaOutput: number;
    pickingAtPeak: number;
  } | null;

  delegations: Delegation[];
  personal: PersonalWork[];
  /** Every time the candidate added capacity at the constrained station. */
  constraintActs: { at: number; ctd: number; where: SceneId }[];
  inspections: { item: string; scene: SceneId; at: number }[];
  log: LogEntry[];
}

/* ── Scoring ──────────────────────────────────────────────────────────── */

export type EvidenceType =
  | "DEMONSTRATED"
  | "PARTIAL"
  | "VERBAL"
  | "NOT_SHOWN"
  | "COUNTER_EVIDENCE";

export interface EvidenceEvent {
  behaviourId: string;
  competencyId: CompetencyId;
  /** The claim this is evidence about, in plain words. */
  claim: string;
  /** Short title for the employer's card. */
  title: string;
  opportunityToDemonstrate: boolean;
  simTime: number | null;
  stateBefore: string;
  candidateAction: string;
  timingContext: string;
  stateAfter: string;
  /** What it led to later in the shift, when it led to anything. */
  laterConsequence?: string;
  evidenceType: EvidenceType;
  score: 0 | 1 | 2 | 3;
  behaviourTags: string[];
}
