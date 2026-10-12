import { candidatesFor, initialState, interruptDue, reduce } from "./engine";
import { formFor } from "./forms";
import {
  PEAK_AT,
  TEMP_AT,
  aisleBlocked,
  coverageOf,
  flexibleReserve,
  floorHolding,
  isFree,
  isLocked,
  metricsOf,
  perishablesEta,
  projectedPeak,
} from "./model";
import { BY_ID, ROSTER } from "./roster";
import {
  STATIONS,
  type AbsenceChoice,
  type Action,
  type ArjunResponse,
  type CaseStep,
  type ControlFix,
  type FormId,
  type HiringState,
  type Intervention,
  type PlanEntry,
  type RiyaChoice,
  type Stage,
  type Stamped,
  type Station,
  type TaskKind,
  type TriageCall,
  type UnitCall,
} from "./types";

/**
 * Seven managers.
 *
 * Each is a way of running the same shift, written as the decisions that kind
 * of manager makes rather than a list of taps — so the same persona can sit
 * any of the three forms and meet a different store each time.
 *
 * They exist to check the instrument, not the candidate: if the manager who
 * does everything personally does not come out as manager-dependent, or the
 * one who sends a chemical out with open food comes out clean, the scoring is
 * wrong and the build is not finished.
 */

export type PersonaId =
  | "balancedLeader"
  | "strongAsm"
  | "individualHero"
  | "commandControl"
  | "fastReactor"
  | "overAnalyser"
  | "slaFirst";

export interface Style {
  label: string;
  handover: string[];
  /** "balance" reads the board and fixes what is thin — people, devices, riders; "keep" changes nothing. */
  floor: "balance" | "keep";
  absence: AbsenceChoice[];
  riya: { inspect: boolean; choices: RiyaChoice[] };
  arjun: {
    check: string[];
    place: "here" | "aside";
    ack: ArjunResponse["ack"];
    clarify: ArjunResponse["clarify"];
    request: ArjunResponse["request"];
  };
  kase: {
    first: "count" | "records" | "defer";
    /** "best" hands it to whoever suits it; "me" is the manager. */
    countBy: "best" | "me" | string;
    /** Records the manager opens personally. */
    tools: string[];
    /** Or hands the record pull to somebody. */
    recordsBy: "best" | null;
    interrupt: "auto" | "stay";
    units: [UnitCall, UnitCall, UnitCall];
    steps: CaseStep[];
    controls: ControlFix[];
  };
  nil: {
    look: "delegate" | "me" | "sources" | "none";
    sources: string[];
    resolve: "replenish" | "authorise" | "delist" | "ignore";
    restockBy: "best" | "me";
  };
  triage: {
    constraint: "auto" | "delegate" | "handle" | "later";
    aisle: "delegate" | "handle" | "later";
    followUp: "auto" | "handle" | "delegate" | "later";
  };
  bottleneck: {
    panels: "constraint" | "all" | "none";
    /** "misled" believes the Floor Lead. */
    reply: "constraint" | "misled" | "unsure" | null;
    fix: "auto" | "misled" | "everything" | "none";
    aisleBy: "best" | "me";
    run: boolean;
    check: boolean;
  };
  bag: { cleanerBag: 1 | 2; liner: boolean; by: "best" | "me" | "unchanged" };
  plan: "auto" | "hero" | "fast" | "sla" | "analyser";
}

/* ── The shift in progress ────────────────────────────────────────────── */

class Shift {
  state: HiringState;
  actions: Stamped[] = [];
  private ms = 0;

  constructor(
    form: FormId,
    private readonly style: Style,
  ) {
    this.state = initialState(form);
  }

  act(action: Action, thinkMs = 9000): void {
    this.ms += thinkMs;
    const stamped = { a: action, at: this.ms };
    this.actions.push(stamped);
    this.state = reduce(this.state, stamped);
    if (interruptDue(this.state)) this.interrupt();
  }

  /** Orders start backing up in the middle of the investigation. */
  private interrupt(): void {
    const constraint = formFor(this.state.form).constraint;
    if (this.style.kase.interrupt === "auto" && coverageOf(this.state, constraint) < 1) {
      const mover = bestMover(this.state, constraint);
      if (mover) {
        this.act({ t: "caseInterrupt", choice: "stepOut", move: mover });
        return;
      }
    }
    this.act({ t: "caseInterrupt", choice: "stay" });
  }
}

/* ── How a careful manager reads the board ────────────────────────────── */

/** The three an order depends on, worst first: what a manager's eye goes to. Enough is enough. */
function three(cover: Record<Stage, number>, enough = 1): number[] {
  return [cover.picking, cover.putaway, cover.riders].map((value) => Math.min(enough, value)).sort((a, b) => a - b);
}

function liveView(state: HiringState): number[] {
  return three(metricsOf(state).coverage);
}

/** Workflows with nobody on them. */
function empty(state: HiringState): number {
  return STATIONS.filter((station) => !Object.values(state.assign).includes(station)).length;
}

/** Nobody on work they are not trained for. */
function misplaced(state: HiringState): number {
  return ROSTER.filter((e) => {
    const station = state.assign[e.id];
    return station !== undefined && e.id !== "riya" && e.skills[station] < 0.75;
  }).length;
}

/**
 * The board as a careful manager weighs it. Nothing left with nobody on it,
 * and the morning check done before the rush: those are not traded for
 * anything. Then picking, putaway and riders covered for the forecast, to
 * within a few points. Then nobody on work they are not trained for. Then a
 * couple of devices left open for a rush bigger than forecast.
 */
function projectedView(state: HiringState, withTemp: boolean): number[] {
  const view = withTemp && state.tempArrivesAt === null ? { ...state, tempArrivesAt: TEMP_AT } : state;
  const eta = perishablesEta(view);
  return [
    -empty(view),
    eta !== null && eta <= PEAK_AT - 600 ? 1 : 0,
    ...three(projectedPeak(view), 0.95),
    -misplaced(view),
    Math.min(2, flexibleReserve(view).length),
  ];
}

function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (Math.abs(a[i]! - b[i]!) > 0.004) return a[i]! > b[i]!;
  }
  return false;
}

function withMove(state: HiringState, emp: string, to: Station, lock = false): HiringState {
  const locks = { ...state.locks };
  if (lock && to !== "picking") locks[emp] = true;
  else delete locks[emp];
  return { ...state, assign: { ...state.assign, [emp]: to }, locks };
}

function withLock(state: HiringState, emp: string, locked: boolean): HiringState {
  const locks = { ...state.locks };
  if (locked) locks[emp] = true;
  else delete locks[emp];
  return { ...state, locks };
}

function withDesk(state: HiringState, emp: string): HiringState {
  return {
    ...state,
    riders: { ...state.riders, desk: emp },
    busy: { ...state.busy, [emp]: { until: Infinity, task: "riders" } },
  };
}

function movable(state: HiringState, id: string): boolean {
  return id !== "riya" && id !== "temp" && isFree(state, id);
}

/** One thing a manager can change on the floor board. */
type BoardStep =
  | { kind: "assign"; emp: string; to: Station }
  | { kind: "lock"; emp: string; locked: boolean }
  | { kind: "standby" };

function applyStep(state: HiringState, step: BoardStep): HiringState {
  if (step.kind === "assign") return withMove(state, step.emp, step.to);
  if (step.kind === "lock") return withLock(state, step.emp, step.locked);
  return { ...state, riders: { ...state.riders, standby: true } };
}

/** The single change that most improves the board, if any does. */
function bestStep(state: HiringState, view: (s: HiringState) => number[]): BoardStep | null {
  let best: BoardStep | null = null;
  let bestView = view(state);
  const consider = (step: BoardStep) => {
    const after = view(applyStep(state, step));
    if (better(after, bestView)) {
      best = step;
      bestView = after;
    }
  };

  for (const emp of Object.keys(state.assign)) {
    if (!movable(state, emp)) continue;
    for (const to of STATIONS) {
      if (to !== state.assign[emp] && (BY_ID[emp]?.skills[to] ?? 0) >= 0.8) consider({ kind: "assign", emp, to });
    }
    if (state.assign[emp] !== "picking") consider({ kind: "lock", emp, locked: !isLocked(state, emp) });
  }
  if (!state.riders.standby) consider({ kind: "standby" });
  return best;
}

/** Who to send to the stage that is stuck, live, if sending anybody helps. */
function bestMover(state: HiringState, to: Stage): string | null {
  if (to === "auditing") return null;
  let best: string | null = null;
  let bestView = liveView(state);
  for (const emp of Object.keys(state.assign)) {
    if (!movable(state, emp)) continue;
    let after: HiringState;
    if (to === "riders") {
      if (state.riders.desk || !BY_ID[emp]?.auth.riders) continue;
      after = withDesk(state, emp);
    } else {
      if (state.assign[emp] === to || (BY_ID[emp]?.skills[to] ?? 0) < 0.8) continue;
      after = withMove(state, emp, to, true);
    }
    const view = liveView(after);
    if (better(view, bestView)) {
      best = emp;
      bestView = view;
    }
  }
  return best;
}

/** Whoever suits a job and is free, preferring somebody whose own work it is. */
function suited(state: HiringState, kind: TaskKind): string | null {
  const home: Partial<Record<TaskKind, Station>> = {
    search: "putaway",
    replenish: "putaway",
    inbound: "putaway",
    aisle: "putaway",
    count: "auditing",
    records: "auditing",
    followUp: "auditing",
    audit: "auditing",
    perishables: "auditing",
    repack: "picking",
  };
  const pool = candidatesFor(state, kind).filter((c) => c.free && c.fit >= 0.8);
  const atHome = pool.find((c) => state.assign[c.id] === home[kind]);
  return (atHome ?? pool[0])?.id ?? null;
}

/** The first free person, suited or not. How a manager in a hurry delegates. */
function nearest(state: HiringState): string {
  return Object.keys(state.assign).find((id) => id !== "riya" && isFree(state, id)) ?? "manu";
}

/* ── The scenes ───────────────────────────────────────────────────────── */

function handover(shift: Shift, style: Style): void {
  for (const item of style.handover) shift.act({ t: "inspect", item }, 12000);
  shift.act({ t: "takeShift" });
}

function rebalance(shift: Shift, withTemp: boolean): void {
  const view = (s: HiringState) => projectedView(s, withTemp);
  for (let i = 0; i < 8; i += 1) {
    const step = bestStep(shift.state, view);
    if (!step) return;
    if (step.kind === "assign") shift.act({ t: "assign", emp: step.emp, to: step.to }, 15000);
    else if (step.kind === "lock") shift.act({ t: "lock", emp: step.emp, locked: step.locked }, 8000);
    else shift.act({ t: "standby", on: true }, 10000);
  }
}

function floor(shift: Shift, style: Style): void {
  if (style.floor === "balance") rebalance(shift, false);
  shift.act({ t: "lockFloor" });
  if (style.absence.includes("reallocate")) rebalance(shift, style.absence.includes("onDemand"));
  shift.act({ t: "absence", choices: style.absence }, 20000);
}

function people(shift: Shift, style: Style): void {
  if (style.riya.inspect) shift.act({ t: "inspect", item: "riyaNumbers" }, 25000);
  shift.act({ t: "riya", choices: style.riya.choices }, 20000);

  shift.act({ t: "arjunPlace", place: style.arjun.place });
  for (const item of style.arjun.check) shift.act({ t: "inspect", item }, 15000);
  shift.act(
    { t: "arjunRespond", ack: style.arjun.ack, clarify: style.arjun.clarify, request: style.arjun.request },
    30000,
  );
}

function investigate(shift: Shift, style: Style): void {
  const k = style.kase;
  if (k.first === "defer") {
    shift.act({ t: "deferCase" });
    return;
  }

  const count = () => {
    const owner = k.countBy === "best" ? (suited(shift.state, "count") ?? "me") : k.countBy;
    shift.act({ t: "startCount", owner });
  };
  const records = () => {
    if (k.recordsBy === "best") {
      const owner = suited(shift.state, "records") ?? nearest(shift.state);
      shift.act({ t: "pullRecords", owner });
    }
    for (const item of k.tools) shift.act({ t: "inspect", item }, 20000);
  };

  if (k.first === "count") {
    count();
    records();
  } else {
    records();
    count();
  }
  shift.act({ t: "wait" });
  shift.act({ t: "disposition", units: k.units, steps: k.steps, controls: k.controls }, 40000);
}

function nilPick(shift: Shift, style: Style): void {
  const n = style.nil;
  if (n.look === "delegate") {
    shift.act({ t: "nilSearch", owner: suited(shift.state, "search") ?? nearest(shift.state) });
    shift.act({ t: "wait" });
  } else if (n.look === "me") {
    shift.act({ t: "nilSearch", owner: "me" });
  } else if (n.look === "sources") {
    for (const item of n.sources) shift.act({ t: "inspect", item }, 15000);
  }

  if (n.resolve === "replenish") {
    const owner = n.restockBy === "me" ? "me" : (suited(shift.state, "replenish") ?? "me");
    shift.act({ t: "nilResolve", how: "replenish", owner });
  } else {
    shift.act({ t: "nilResolve", how: n.resolve });
  }
}

function triage(shift: Shift, style: Style): void {
  const state = shift.state;
  const constraint = formFor(state.form).constraint;
  const t = style.triage;
  const call = (mode: "handle" | "delegate" | "later", owner: string | null): TriageCall =>
    mode === "delegate" && owner ? { mode, owner } : { mode: mode === "delegate" ? "later" : mode };

  const needs = coverageOf(state, constraint) < 1;
  const constraintMode = t.constraint === "auto" ? (needs ? "delegate" : "later") : t.constraint;
  const mover =
    t.constraint === "delegate" && style.plan === "fast" ? nearest(state) : bestMover(state, constraint);

  const followMode = t.followUp === "auto" ? (state.followUp === "done" ? "later" : "handle") : t.followUp;

  shift.act(
    {
      t: "triage",
      constraint: call(constraintMode, mover),
      aisle: call(t.aisle, suited(state, "aisle")),
      followUp: call(followMode, suited(state, "followUp")),
    },
    35000,
  );
}

const PANEL: Record<Stage, string> = {
  picking: "bnPicking",
  putaway: "bnShelf",
  auditing: "bnDevices",
  riders: "bnRiders",
};

/** The device whose lock, changed, does the most for the store right now. */
function bestLock(state: HiringState, locked: boolean, on?: Station): string | null {
  let best: string | null = null;
  let bestView = liveView(state);
  for (const emp of Object.keys(state.assign)) {
    const station = state.assign[emp]!;
    if (!movable(state, emp) || station === "picking" || isLocked(state, emp) === locked) continue;
    if (on && station !== on) continue;
    const view = liveView(withLock(state, emp, locked));
    if (better(view, bestView)) {
      best = emp;
      bestView = view;
    }
  }
  return best;
}

/** What a manager who has found the constraint does about it: one change, two at most. */
function fixFor(state: HiringState, constraint: Stage, aisleBy: "best" | "me"): Intervention[] {
  const moves: Intervention[] = [];

  if (constraint === "picking") {
    if (aisleBlocked(state)) {
      moves.push({ kind: "clearAisle", owner: aisleBy === "me" ? "me" : (suited(state, "aisle") ?? "me") });
      return moves;
    }
    // A locked device that can pick is the cheapest picker in the building.
    const open = bestLock(state, false);
    if (open) moves.push({ kind: "lock", emp: open, locked: false });
    else {
      const mover = bestMover(state, "picking");
      if (mover) moves.push({ kind: "move", emp: mover, to: "picking" });
    }
    return moves;
  }

  moves.push({ kind: "addSlot", station: constraint });
  const eased: HiringState = { ...state, shocks: { ...state.shocks, lanes: [...state.shocks.lanes, constraint] } };
  if (coverageOf(eased, constraint) >= 0.97) return moves;

  if (constraint === "putaway") {
    // The app is taking the putaway hands for orders: close a device before sending anybody new.
    const close = bestLock(eased, true, "putaway");
    if (close) moves.push({ kind: "lock", emp: close, locked: true });
    else {
      const mover = bestMover(eased, "putaway");
      if (mover) moves.push({ kind: "move", emp: mover, to: "putaway" });
    }
  } else if (constraint === "riders") {
    const desk = bestMover(eased, "riders");
    if (desk) moves.push({ kind: "riderDesk", emp: desk });
    else if (!state.riders.standby) moves.push({ kind: "standby" });
  }
  return moves;
}

function bottleneck(shift: Shift, style: Style): void {
  const b = style.bottleneck;
  const form = formFor(shift.state.form);
  const constraint = shift.state.bn.constraintAtStart ?? form.constraint;
  const misled: Station = shift.state.bn.blamed ?? "picking";

  const panels =
    b.panels === "all"
      ? ["bnPicking", "bnShelf", "bnRiders", "bnDevices", "bnAisle", "bnQueue"]
      : b.panels === "constraint"
        ? ["bnQueue", PANEL[constraint]]
        : [];
  for (const item of panels) shift.act({ t: "inspect", item }, 12000);

  const holding = floorHolding(shift.state.bn.coverageAtStart ?? metricsOf(shift.state).coverage);
  if (b.reply === "constraint") shift.act({ t: "floorLeadReply", call: holding ? "holding" : constraint });
  else if (b.reply === "misled") shift.act({ t: "floorLeadReply", call: misled });
  else if (b.reply === "unsure") shift.act({ t: "floorLeadReply", call: "unsure" });

  let moves: Intervention[] = [];
  const state = shift.state;
  const stuck = !holding;

  if (b.fix === "auto" && stuck) {
    moves = fixFor(state, constraint, b.aisleBy);
  } else if (b.fix === "misled") {
    // Does what the Floor Lead said: more hands on the work he named, taken from the other.
    const from: Station = misled === "picking" ? "putaway" : "picking";
    const emp = Object.keys(state.assign).find((id) => state.assign[id] === from && movable(state, id));
    if (emp) moves.push({ kind: "move", emp, to: misled });
  } else if (b.fix === "everything") {
    if (constraint !== "picking") moves.push({ kind: "addSlot", station: constraint });
    const mover = bestMover(state, constraint);
    if (mover) moves.push(constraint === "riders" ? { kind: "riderDesk", emp: mover } : { kind: "move", emp: mover, to: constraint as Station });
    if (!state.riders.standby) moves.push({ kind: "standby" });
    moves.push({ kind: "slowRelease" });
  }

  if (moves.length) shift.act({ t: "intervene", moves }, 30000);
  if (b.run) shift.act({ t: "runSystem" });
  if (b.check) shift.act({ t: "inspect", item: "bnEffect" });
  shift.act({ t: "next" });
}

function bag(shift: Shift, style: Style): void {
  const by =
    style.bag.by === "best" ? (suited(shift.state, "repack") ?? "me") : style.bag.by;
  shift.act({ t: "bag", cleanerBag: style.bag.cleanerBag, cleanerLiner: style.bag.liner, by }, 25000);
}

function plan(shift: Shift, style: Style): void {
  const state = shift.state;
  const constraint = formFor(state.form).constraint;
  const tasks: Record<string, PlanEntry> = {};
  let now = 0;
  let handed = 0;
  const used = new Set<string>();

  const owner = (kind: TaskKind | null, id: string): string | null => {
    if (id === "constraint") return bestMover(state, constraint);
    if (!kind) return null;
    const pool = candidatesFor(state, kind).filter((c) => c.free && c.fit >= 0.8 && !used.has(c.id));
    return pool[0]?.id ?? null;
  };

  for (const task of state.tasksOffered) {
    const fix = task.id === "lateOrder" ? ({ fix: "informPriority" } as const) : {};
    let entry: PlanEntry = { bucket: "later" };

    if (style.plan === "auto" || style.plan === "analyser") {
      if (task.urgent && task.managerLevel && now < 3) {
        entry = { bucket: "now" };
      } else if (task.urgent) {
        const who = owner(task.kind, task.id);
        if (who && handed < 3) entry = { bucket: "delegate", owner: who, ...fix };
        else if (now < 3) entry = { bucket: "now", ...fix };
      }
      // The careful one cannot leave a count unstarted.
      if (style.plan === "analyser" && task.id === "audit") {
        const who = owner("audit", "audit");
        if (who && handed < 3) entry = { bucket: "delegate", owner: who };
      }
      // ...or a promised conversation unhad.
      if (style.plan === "analyser" && task.id === "riyaCoaching" && now < 3) entry = { bucket: "now" };
    } else if (style.plan === "hero") {
      if (task.urgent && now < 3) entry = { bucket: "now", ...fix };
    } else if (style.plan === "fast") {
      if (["constraint", "riders", "lateOrder"].includes(task.id) && now < 3) {
        entry = { bucket: "now", ...(task.id === "lateOrder" ? { fix: "voucher" as const } : {}) };
      }
    } else if (style.plan === "sla") {
      if (task.id === "constraint" || task.id === "riders" || task.id === "aisle") {
        const who = owner(task.kind, task.id);
        if (who && handed < 3) entry = { bucket: "delegate", owner: who };
      } else if (task.id === "lateOrder") {
        entry = { bucket: "now", fix: "voucher" };
      }
    }

    if (entry.bucket === "now") now += 1;
    if (entry.bucket === "delegate") {
      handed += 1;
      if (entry.owner) used.add(entry.owner);
    }
    tasks[task.id] = entry;
  }

  shift.act({ t: "plan", tasks }, 45000);
  shift.act({ t: "next" });
}

/* ── The seven ────────────────────────────────────────────────────────── */

const balancedLeader: Style = {
  label: "Balanced Floor Leader",
  handover: ["team", "riders", "perishables", "demand"],
  floor: "balance",
  absence: ["onDemand", "extend"],
  riya: { inspect: true, choices: ["lockPutaway", "phaseLater"] },
  arjun: { check: ["incentiveStatus"], place: "aside", ack: "recognise", clarify: "verified", request: "respectful" },
  kase: {
    first: "count",
    countBy: "best",
    tools: ["orders", "scan", "movement", "exception"],
    recordsBy: null,
    interrupt: "auto",
    units: ["explained", "recovered", "unresolved"],
    steps: ["preserve", "controlAccess", "escalate"],
    controls: ["scanAtIssue", "exceptionRestow"],
  },
  nil: { look: "delegate", sources: [], resolve: "replenish", restockBy: "best" },
  triage: { constraint: "auto", aisle: "delegate", followUp: "auto" },
  bottleneck: { panels: "constraint", reply: "constraint", fix: "auto", aisleBy: "best", run: true, check: true },
  bag: { cleanerBag: 2, liner: false, by: "best" },
  plan: "auto",
};

/** Very good, and human: a conversation on the floor, one control not two, a result not checked. */
const strongAsm: Style = {
  ...balancedLeader,
  label: "Strong ASM",
  handover: ["team", "riders", "demand"],
  riya: { inspect: true, choices: ["pair", "phaseLater"] },
  arjun: { check: ["incentiveStatus"], place: "here", ack: "recognise", clarify: "verified", request: "respectful" },
  kase: { ...balancedLeader.kase, tools: ["orders", "scan", "movement", "exception", "access"], controls: ["scanAtIssue", "remindTeam"] },
  bottleneck: { ...balancedLeader.bottleneck, check: false },
};

/** Right about nearly everything, and does nearly all of it personally. */
const individualHero: Style = {
  ...balancedLeader,
  label: "Individual Hero",
  kase: { ...balancedLeader.kase, countBy: "me", tools: ["orders", "scan", "movement", "exception"], interrupt: "stay" },
  nil: { look: "me", sources: [], resolve: "replenish", restockBy: "me" },
  triage: { constraint: "handle", aisle: "handle", followUp: "handle" },
  bottleneck: { ...balancedLeader.bottleneck, aisleBy: "me" },
  bag: { cleanerBag: 2, liner: false, by: "me" },
  plan: "hero",
};

/** Runs the floor well and the people badly. */
const commandControl: Style = {
  ...balancedLeader,
  label: "Command-and-Control",
  absence: ["reallocate", "extend"],
  riya: { inspect: false, choices: ["returnAgency", "warn"] },
  arjun: { check: [], place: "here", ack: "dismiss", clarify: "deflect", request: "threat" },
  kase: { ...balancedLeader.kase, controls: ["remindTeam"] },
};

/** Moves first and looks afterwards, if at all. */
const fastReactor: Style = {
  label: "Fast Reactor",
  handover: [],
  floor: "keep",
  absence: ["short"],
  riya: { inspect: false, choices: ["keep"] },
  arjun: { check: [], place: "here", ack: "neutral", clarify: "guess", request: "respectful" },
  kase: {
    first: "count",
    countBy: "rahul",
    tools: [],
    recordsBy: null,
    interrupt: "stay",
    units: ["writeoff", "writeoff", "theft"],
    steps: ["writeOff", "accuse"],
    controls: ["remindTeam"],
  },
  nil: { look: "none", sources: [], resolve: "authorise", restockBy: "me" },
  triage: { constraint: "delegate", aisle: "later", followUp: "later" },
  bottleneck: { panels: "none", reply: "misled", fix: "misled", aisleBy: "me", run: true, check: false },
  bag: { cleanerBag: 1, liner: true, by: "me" },
  plan: "fast",
};

/** Looks at everything, concludes correctly, and gets there after the floor needed it. */
const overAnalyser: Style = {
  label: "Over-Analyser",
  handover: ["team", "riders", "floorwalk", "perishables", "audits", "demand"],
  floor: "keep",
  absence: ["extend"],
  riya: { inspect: true, choices: ["phaseLater"] },
  arjun: { check: ["incentiveStatus", "eligibility"], place: "aside", ack: "recognise", clarify: "verified", request: "respectful" },
  kase: {
    first: "records",
    countBy: "best",
    tools: ["movement", "orders", "scan", "access", "exception"],
    recordsBy: null,
    interrupt: "stay",
    units: ["explained", "recovered", "unresolved"],
    steps: ["preserve", "controlAccess", "escalate"],
    controls: ["scanAtIssue", "exceptionRestow"],
  },
  nil: { look: "sources", sources: ["overstock", "adjacentBin", "transactions", "replenArea"], resolve: "replenish", restockBy: "best" },
  triage: { constraint: "later", aisle: "later", followUp: "auto" },
  bottleneck: { panels: "all", reply: "constraint", fix: "auto", aisleBy: "best", run: true, check: true },
  bag: { cleanerBag: 2, liner: false, by: "best" },
  plan: "analyser",
};

/** Protects click-to-dispatch, and pays for it with the customer and the controls. */
const slaFirst: Style = {
  label: "SLA-First",
  handover: ["riders", "demand"],
  floor: "balance",
  absence: ["onDemand", "extend"],
  riya: { inspect: false, choices: ["target"] },
  arjun: { check: [], place: "here", ack: "neutral", clarify: "promise", request: "order" },
  kase: {
    first: "defer",
    countBy: "best",
    tools: [],
    recordsBy: null,
    interrupt: "stay",
    units: ["unresolved", "unresolved", "unresolved"],
    steps: [],
    controls: [],
  },
  nil: { look: "none", sources: [], resolve: "authorise", restockBy: "me" },
  triage: { constraint: "handle", aisle: "delegate", followUp: "later" },
  bottleneck: { panels: "constraint", reply: "constraint", fix: "everything", aisleBy: "best", run: true, check: true },
  bag: { cleanerBag: 1, liner: false, by: "unchanged" },
  plan: "sla",
};

export const PERSONAS: Record<PersonaId, Style> = {
  balancedLeader,
  strongAsm,
  individualHero,
  commandControl,
  fastReactor,
  overAnalyser,
  slaFirst,
};

/** Sit a form in a given style. Returns what was done, and the store it left. */
export function sitShift(form: FormId, style: Style): { actions: Stamped[]; state: HiringState } {
  const shift = new Shift(form, style);
  handover(shift, style);
  floor(shift, style);
  people(shift, style);
  investigate(shift, style);
  nilPick(shift, style);
  triage(shift, style);
  bottleneck(shift, style);
  bag(shift, style);
  plan(shift, style);
  return { actions: shift.actions, state: shift.state };
}

export const PEAK_CLOCK = PEAK_AT;
