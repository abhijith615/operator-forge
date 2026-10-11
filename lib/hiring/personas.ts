import { candidatesFor, initialState, interruptDue, reduce } from "./engine";
import { formFor } from "./forms";
import { PEAK_AT, aisleBlocked, coverageOf, floorHolding, isFree, metricsOf, projectedPeak } from "./model";
import { BY_ID } from "./roster";
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
 * one who dispatches a chemical with open food comes out clean, the scoring is
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
  /** "balance" reads the board and fixes the thinnest station; "keep" changes nothing. */
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

  /** The queue starts rising in the middle of the investigation. */
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

const FLOW: Station[] = ["picking", "packing", "dispatch"];

/** Coverage, worst first: what a manager's eye goes to. */
function liveView(state: HiringState): number[] {
  return FLOW.map((station) => coverageOf(state, station)).sort((a, b) => a - b);
}

function projectedView(state: HiringState, withTemp: boolean): number[] {
  const view = withTemp && state.tempArrivesAt === null ? { ...state, tempArrivesAt: 1500 } : state;
  const p = projectedPeak(view);
  // The floor station is support: it can run a little under without hurting.
  return [p.picking, p.packing, p.dispatch, p.replenishment / 0.9].sort((a, b) => a - b);
}

function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (Math.abs(a[i]! - b[i]!) > 0.004) return a[i]! > b[i]!;
  }
  return false;
}

function withMove(state: HiringState, emp: string, to: Station): HiringState {
  return { ...state, assign: { ...state.assign, [emp]: to } };
}

/** The single move that most improves the board, if any does. */
function bestSwap(
  state: HiringState,
  view: (s: HiringState) => number[],
  only?: Station,
): { emp: string; to: Station } | null {
  let best: { emp: string; to: Station } | null = null;
  let bestView = view(state);
  for (const emp of Object.keys(state.assign)) {
    if (emp === "riya" || emp === "temp" || !isFree(state, emp)) continue;
    for (const to of STATIONS) {
      if (only && to !== only) continue;
      if (to === state.assign[emp] || (BY_ID[emp]?.skills[to] ?? 0) < 0.8) continue;
      const after = view(withMove(state, emp, to));
      if (better(after, bestView)) {
        best = { emp, to };
        bestView = after;
      }
    }
  }
  return best;
}

function bestMover(state: HiringState, to: Station): string | null {
  const view = (s: HiringState) =>
    to === "replenishment"
      ? [coverageOf(s, "replenishment"), ...liveView(s)].sort((a, b) => a - b)
      : liveView(s);
  return bestSwap(state, view, to)?.emp ?? null;
}

/** Whoever suits a job and is free, preferring somebody whose station it belongs to. */
function suited(state: HiringState, kind: TaskKind): string | null {
  const home: Partial<Record<TaskKind, Station>> = {
    search: "replenishment",
    replenish: "replenishment",
    inbound: "replenishment",
    aisle: "replenishment",
    riders: "dispatch",
    lateOrder: "dispatch",
    repack: "packing",
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

/** Two people changing places, when no single move helps. */
function bestExchange(state: HiringState, view: (s: HiringState) => number[]): [string, string] | null {
  let best: [string, string] | null = null;
  let bestView = view(state);
  const people = Object.keys(state.assign).filter((id) => id !== "riya" && id !== "temp" && isFree(state, id));
  for (const a of people) {
    for (const b of people) {
      const [at, bt] = [state.assign[a]!, state.assign[b]!];
      if (a >= b || at === bt) continue;
      if ((BY_ID[a]?.skills[bt] ?? 0) < 0.8 || (BY_ID[b]?.skills[at] ?? 0) < 0.8) continue;
      const after = view(withMove(withMove(state, a, bt), b, at));
      if (better(after, bestView)) {
        best = [a, b];
        bestView = after;
      }
    }
  }
  return best;
}

function rebalance(shift: Shift, withTemp: boolean): void {
  const view = (s: HiringState) => projectedView(s, withTemp);
  for (let i = 0; i < 6; i += 1) {
    const move = bestSwap(shift.state, view);
    if (move) {
      shift.act({ t: "assign", emp: move.emp, to: move.to }, 15000);
      continue;
    }
    const exchange = bestExchange(shift.state, view);
    if (!exchange) return;
    const [a, b] = exchange;
    const [at, bt] = [shift.state.assign[a]!, shift.state.assign[b]!];
    shift.act({ t: "assign", emp: a, to: bt }, 15000);
    shift.act({ t: "assign", emp: b, to: at }, 15000);
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
  const constraintStation = formFor(state.form).constraint;
  const t = style.triage;
  const call = (mode: "handle" | "delegate" | "later", owner: string | null): TriageCall =>
    mode === "delegate" && owner ? { mode, owner } : { mode: mode === "delegate" ? "later" : mode };

  const needs = coverageOf(state, constraintStation) < 1;
  const constraintMode = t.constraint === "auto" ? (needs ? "delegate" : "later") : t.constraint;
  const mover =
    t.constraint === "delegate" && style.plan === "fast"
      ? nearest(state)
      : bestMover(state, constraintStation);

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

const PANEL: Record<Station, string> = {
  picking: "bnPicking",
  packing: "bnPacking",
  dispatch: "bnDispatch",
  replenishment: "bnShelf",
};

function bottleneck(shift: Shift, style: Style): void {
  const b = style.bottleneck;
  const form = formFor(shift.state.form);
  const constraint = shift.state.bn.constraintAtStart ?? form.constraint;
  const misled: Station = shift.state.bn.blamed ?? "picking";

  const panels =
    b.panels === "all"
      ? ["bnPicking", "bnPacking", "bnDispatch", "bnShelf", "bnAisle", "bnQueue"]
      : b.panels === "constraint"
        ? ["bnQueue", PANEL[constraint]]
        : [];
  for (const item of panels) shift.act({ t: "inspect", item }, 12000);

  const holding = floorHolding(shift.state.bn.coverageAtStart ?? metricsOf(shift.state).coverage);
  if (b.reply === "constraint") shift.act({ t: "floorLeadReply", call: holding ? "holding" : constraint });
  else if (b.reply === "misled") shift.act({ t: "floorLeadReply", call: misled });
  else if (b.reply === "unsure") shift.act({ t: "floorLeadReply", call: "unsure" });

  const moves: Intervention[] = [];
  const state = shift.state;
  const stuck = !holding;

  if (b.fix === "auto" && stuck) {
    if (constraint === "picking") {
      if (aisleBlocked(state)) {
        moves.push({ kind: "clearAisle", owner: b.aisleBy === "me" ? "me" : (suited(state, "aisle") ?? "me") });
      } else {
        const mover = bestMover(state, "picking");
        if (mover) moves.push({ kind: "move", emp: mover, to: "picking" });
      }
    } else {
      moves.push({ kind: "addSlot", station: constraint });
      const after: HiringState = { ...state, shocks: { ...state.shocks, lanes: [...state.shocks.lanes, constraint] } };
      if (coverageOf(after, constraint) < 0.97) {
        const mover = bestMover(after, constraint);
        if (mover) moves.push({ kind: "move", emp: mover, to: constraint });
      }
    }
  } else if (b.fix === "misled") {
    // Does what the Floor Lead said: more hands at the stage he named.
    const from: Station = misled === "picking" ? "packing" : "picking";
    const emp = Object.keys(state.assign).find((id) => state.assign[id] === from && id !== "riya" && isFree(state, id));
    if (emp) moves.push({ kind: "move", emp, to: misled });
  } else if (b.fix === "everything") {
    moves.push({ kind: "addSlot", station: constraint });
    const mover = bestMover(state, constraint);
    if (mover) moves.push({ kind: "move", emp: mover, to: constraint });
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
      // The careful one cannot leave an audit unstarted.
      if (style.plan === "analyser" && task.id === "audit") {
        const who = owner("audit", "audit");
        if (who && handed < 3) entry = { bucket: "delegate", owner: who };
      }
      // ...or a promised coaching conversation unhad.
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
  handover: ["team", "demand", "pending"],
  floor: "balance",
  absence: ["onDemand", "extend"],
  riya: { inspect: true, choices: ["moveAB", "coachLater"] },
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
  handover: ["team", "demand"],
  riya: { inspect: true, choices: ["pair", "coachLater"] },
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
  riya: { inspect: false, choices: ["removePicking", "warn"] },
  arjun: { check: [], place: "here", ack: "dismiss", clarify: "deflect", request: "threat" },
  kase: { ...balancedLeader.kase, controls: ["remindTeam"] },
};

/** Moves first and looks afterwards, if at all. */
const fastReactor: Style = {
  label: "Fast Reactor",
  handover: [],
  floor: "keep",
  absence: ["short"],
  riya: { inspect: false, choices: ["moveToPacking"] },
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
  handover: ["team", "metrics", "pending", "demand"],
  floor: "keep",
  absence: ["extend"],
  riya: { inspect: true, choices: ["coachLater"] },
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
  handover: ["metrics", "demand"],
  floor: "balance",
  absence: ["onDemand", "extend"],
  riya: { inspect: false, choices: ["moveToPacking"] },
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
