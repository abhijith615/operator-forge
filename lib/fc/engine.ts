import {
  BOOKED,
  D2_DOWN,
  DAIRY_LATE_ARRIVES,
  DOCKS,
  HANDOVER_TEAM,
  PERSON,
  SLOTS,
  SUITED,
  VEHICLES,
  type DockId,
  type JobId,
  type PersonId,
  type VehicleId,
} from "./content";
import { SCHEDULE, type Action, type FcState, type Owner, type Placement, type SceneId, type Stamped } from "./types";

/**
 * The FC Executive shift engine.
 *
 * `reduce` applies one action and returns the next state, or the same state
 * object if the action is not possible right now (so a stale tap does
 * nothing). It is pure and deterministic: the server replays the stored
 * actions through it to score an attempt.
 */

export function initialState(): FcState {
  return {
    scene: "handover",
    clock: 0,
    seq: 0,
    log: [],
    reachedAt: { handover: 0 },
    expiredIn: null,
    viewed: [],
    board: {},
    initialPlan: null,
    plannedPeak: 0,
    team: { ...HANDOVER_TEAM },
    teamLocked: false,
    bumped: [],
    quickbev: null,
    notified: false,
    finalPlan: null,
    receive: { checks: {}, steps: {}, step: 0, count: null, reconciled: false, qc: null, grn: null, putaway: null, closed: false },
    disc: { evidence: [], recount: null, decision: null },
    data: { tools: [], deduped: false, dedupedAfterPrompt: false, prompted: false, signals: null, driver: null, report: null, escalation: null },
    peak: { buckets: null, vendorReply: null, procurement: null },
    personal: [],
    handed: [],
  };
}

/* ── The dock board ───────────────────────────────────────────────────── */

/** When a truck can first start. FreshFarm is an hour late once the 07:45 update has landed. */
export function arrivesAt(state: Pick<FcState, "initialPlan">, v: VehicleId): number {
  if (v === "dairy" && state.initialPlan !== null) return DAIRY_LATE_ARRIVES;
  return VEHICLES[v].arrives;
}

export function covers(p: Placement, length: number, slot: number): boolean {
  return slot >= p.start && slot < p.start + length;
}

/** Trucks being unloaded in a slot. */
export function busyAt(board: Partial<Record<VehicleId, Placement>>, slot: number): VehicleId[] {
  return (Object.keys(board) as VehicleId[]).filter((v) => covers(board[v]!, VEHICLES[v].length, slot));
}

export function peakOf(board: Partial<Record<VehicleId, Placement>>): number {
  let peak = 0;
  for (let slot = 0; slot < SLOTS; slot += 1) peak = Math.max(peak, busyAt(board, slot).length);
  return peak;
}

/** Unloading crews the team allows: two loaders and one scanner each. */
export function crewsOf(team: FcState["team"]): number {
  const count = (task: string) => Object.values(team).filter((t) => t === task).length;
  return Math.min(Math.floor(count("unload") / 2), count("scan"));
}

/** Is Dock 2 under repair in this slot? Only once the 07:45 update has been given. */
export function dockClosed(state: Pick<FcState, "initialPlan">, dock: DockId, slot: number): boolean {
  return state.initialPlan !== null && dock === "D2" && D2_DOWN.includes(slot);
}

/** Can this truck go here? Physically: the dock is free, it has arrived, it fits in the day. */
export function canPlace(state: FcState, v: VehicleId, dock: DockId, start: number): boolean {
  const { length } = VEHICLES[v];
  if (!DOCKS.includes(dock) || start < 0 || start + length > SLOTS) return false;
  if (start < arrivesAt(state, v)) return false;
  for (let slot = start; slot < start + length; slot += 1) {
    if (dockClosed(state, dock, slot)) return false;
  }
  return (Object.keys(state.board) as VehicleId[]).every((other) => {
    if (other === v) return true;
    const p = state.board[other]!;
    if (p.dock !== dock) return true;
    const otherLength = VEHICLES[other].length;
    return start + length <= p.start || p.start + otherLength <= start;
  });
}

/** The trucks on the board's tray right now. */
export function trayOf(state: FcState): VehicleId[] {
  const pool: VehicleId[] = state.initialPlan === null ? [...BOOKED] : [...BOOKED, ...(state.quickbev === "board" ? (["quickbev"] as VehicleId[]) : [])];
  return pool.filter((v) => !state.board[v]);
}

/* ── Applying an action ───────────────────────────────────────────────── */

function enter(state: FcState, scene: SceneId, at: number): FcState {
  return {
    ...state,
    scene,
    clock: Math.max(state.clock, SCHEDULE[scene]),
    reachedAt: state.reachedAt[scene] === undefined ? { ...state.reachedAt, [scene]: at } : state.reachedAt,
  };
}

function tick(state: FcState, minutes: number): FcState {
  return { ...state, clock: state.clock + minutes };
}

/** Somebody was given a job, or the candidate took it on. */
function owned(state: FcState, job: JobId, owner: Owner): FcState {
  if (owner === "me") return { ...state, personal: [...state.personal, { job, at: state.clock }] };
  return { ...state, handed: [...state.handed, { job, to: owner, suited: SUITED[job].includes(owner) }] };
}

const isOwner = (value: unknown): value is Owner => value === "me" || (typeof value === "string" && value in PERSON);

function apply(state: FcState, action: Action, at: number): FcState | null {
  const s = state;
  switch (action.t) {
    case "view":
      if (typeof action.panel !== "string" || action.panel.length > 40) return null;
      return s.viewed.includes(action.panel) ? null : { ...s, viewed: [...s.viewed, action.panel] };

    case "continue":
      if (s.scene === "handover") return enter(s, "plan", at);
      return null;

    case "place": {
      if (s.scene !== "plan" && s.scene !== "replan") return null;
      if (s.scene === "plan" && s.initialPlan !== null) return null;
      if (!(action.v in VEHICLES)) return null;
      if (s.scene === "plan" && !BOOKED.includes(action.v)) return null;
      if (action.v === "quickbev" && s.scene !== "replan") return null;
      if (!canPlace(s, action.v, action.dock, action.start)) return null;
      const next = { ...s, board: { ...s.board, [action.v]: { dock: action.dock, start: action.start } } };
      return action.v === "quickbev" ? { ...next, quickbev: "board" } : next;
    }

    case "unplace": {
      if (s.scene !== "plan" && s.scene !== "replan") return null;
      if (s.scene === "plan" && s.initialPlan !== null) return null;
      if (!s.board[action.v]) return null;
      const board = { ...s.board };
      delete board[action.v];
      return { ...s, board };
    }

    case "lockPlan":
      if (s.scene !== "plan" || s.initialPlan !== null) return null;
      return tick({ ...s, initialPlan: { ...s.board } }, 10);

    case "assign": {
      if (s.scene !== "plan" || s.initialPlan === null || s.teamLocked) return null;
      const person = PERSON[action.p];
      if (!person || !person.skills.includes(action.task)) return null;
      if (s.team[action.p] === action.task) return null;
      return { ...s, team: { ...s.team, [action.p]: action.task } };
    }

    case "lockTeam": {
      if (s.scene !== "plan" || s.initialPlan === null || s.teamLocked) return null;
      // The 07:45 update: FreshFarm is an hour late and Dock 2 is closed 09:00–10:00.
      // Anything that can no longer stand where it is comes off the board.
      const locked = { ...s, teamLocked: true, plannedPeak: peakOf(s.board) };
      const board = { ...s.board };
      const bumped: VehicleId[] = [];
      for (const v of Object.keys(board) as VehicleId[]) {
        const p = board[v]!;
        const late = p.start < arrivesAt(locked, v);
        let closed = false;
        for (let slot = p.start; slot < p.start + VEHICLES[v].length; slot += 1) if (dockClosed(locked, p.dock, slot)) closed = true;
        if (late || closed) {
          delete board[v];
          bumped.push(v);
        }
      }
      return enter({ ...locked, board, bumped }, "replan", at);
    }

    case "quickbev": {
      if (s.scene !== "replan") return null;
      if (!["board", "offpeak", "turnaway"].includes(action.choice)) return null;
      const board = { ...s.board };
      if (action.choice !== "board") delete board.quickbev;
      return { ...s, quickbev: action.choice, board };
    }

    case "notify":
      if (s.scene !== "replan" || s.notified === action.on) return null;
      return { ...s, notified: Boolean(action.on) };

    case "lockReplan":
      if (s.scene !== "replan") return null;
      return enter({ ...s, finalPlan: { ...s.board } }, "receive", at);

    /* ── Receive ── */

    case "gateCheck": {
      if (s.scene !== "receive" || s.receive.closed || s.receive.checks[action.id] !== undefined) return null;
      const step = s.receive.step + 1;
      return tick({ ...s, receive: { ...s.receive, step, checks: { ...s.receive.checks, [action.id]: step } } }, 2);
    }

    case "unload": {
      if (s.scene !== "receive" || s.receive.closed || s.receive.steps.unload !== undefined) return null;
      const step = s.receive.step + 1;
      return tick({ ...s, receive: { ...s.receive, step, steps: { ...s.receive.steps, unload: step } } }, 20);
    }

    case "count": {
      const r = s.receive;
      if (s.scene !== "receive" || r.closed || r.steps.unload === undefined || r.steps.count !== undefined) return null;
      if (action.choice === "driver") {
        if (r.count?.asked) return null;
        return tick({ ...s, receive: { ...r, count: { choice: "driver", asked: true } } }, 2);
      }
      if (action.choice === "recount" && !isOwner(action.owner)) return null;
      const step = r.step + 1;
      let next: FcState = {
        ...s,
        receive: {
          ...r,
          step,
          steps: { ...r.steps, count: step },
          count: { choice: action.choice, owner: action.owner, asked: r.count?.asked ?? false },
          reconciled: action.choice === "recount",
        },
      };
      if (action.choice === "recount") next = owned(next, "recountCrates", action.owner!);
      return tick(next, action.choice === "recount" ? 8 : 2);
    }

    case "qcCheck": {
      const r = s.receive;
      if (s.scene !== "receive" || r.closed || r.steps.unload === undefined || r.qc || !isOwner(action.owner)) return null;
      const step = r.step + 1;
      const next = { ...s, receive: { ...r, step, steps: { ...r.steps, qc: step }, qc: { owner: action.owner, decision: null } } };
      return tick(owned(next, "qcCheck", action.owner), 10);
    }

    case "qcDecide": {
      const r = s.receive;
      if (s.scene !== "receive" || r.closed || !r.qc || r.qc.decision) return null;
      return { ...s, receive: { ...r, qc: { ...r.qc, decision: action.choice } } };
    }

    case "grn": {
      const r = s.receive;
      if (s.scene !== "receive" || r.closed || r.steps.unload === undefined || r.grn || !isOwner(action.owner)) return null;
      if (![228, 238, 240].includes(action.qty)) return null;
      const step = r.step + 1;
      const next = {
        ...s,
        receive: {
          ...r,
          step,
          steps: { ...r.steps, grn: step },
          grn: { qty: action.qty, owner: action.owner, afterQc: Boolean(r.qc?.decision), reconciled: r.reconciled },
        },
      };
      return tick(owned(next, "grnEntry", action.owner), 5);
    }

    case "putaway": {
      const r = s.receive;
      if (s.scene !== "receive" || r.closed || r.steps.unload === undefined || r.putaway) return null;
      const step = r.step + 1;
      return tick({ ...s, receive: { ...r, step, steps: { ...r.steps, putaway: step }, putaway: action.choice } }, 10);
    }

    case "closeReceipt":
      if (s.scene !== "receive" || s.receive.closed) return null;
      return enter({ ...s, receive: { ...s.receive, closed: true } }, "discrepancy", at);

    /* ── Discrepancy ── */

    case "evidence":
      if (s.scene !== "discrepancy" || s.disc.evidence.includes(action.id)) return null;
      return tick({ ...s, disc: { ...s.disc, evidence: [...s.disc.evidence, action.id] } }, 2);

    case "recountPallet":
      if (s.scene !== "discrepancy" || s.disc.recount || !isOwner(action.owner)) return null;
      return tick(owned({ ...s, disc: { ...s.disc, recount: action.owner } }, "recountPallet", action.owner), 6);

    case "classify": {
      if (s.scene !== "discrepancy" || s.disc.decision) return null;
      const counts = [action.short, action.damaged, action.unscannable];
      if (counts.some((n) => !Number.isInteger(n) || n < 0) || counts.reduce((a, b) => a + b, 0) !== 12) return null;
      let next: FcState = { ...s, disc: { ...s.disc, decision: action } };
      if (action.unscanFate === "relabel" && action.unscannable > 0) {
        if (!isOwner(action.relabelOwner)) return null;
        next = owned(next, "relabel", action.relabelOwner);
      }
      return enter(next, "data", at);
    }

    /* ── Data ── */

    case "sheetTool":
      if (s.scene !== "data" || s.data.tools.includes(action.id)) return null;
      return { ...s, data: { ...s.data, tools: [...s.data.tools, action.id] } };

    case "removeDuplicate":
      if (s.scene !== "data" || s.data.deduped) return null;
      return { ...s, data: { ...s.data, deduped: true, dedupedAfterPrompt: s.data.prompted } };

    case "signals":
      if (s.scene !== "data" || s.data.signals || !Array.isArray(action.picks) || action.picks.length > 3) return null;
      return { ...s, data: { ...s.data, signals: action.picks.slice(0, 3) } };

    case "driver":
      if (s.scene !== "data" || s.data.driver) return null;
      return { ...s, data: { ...s.data, driver: action.id } };

    case "report": {
      if (s.scene !== "data" || s.data.report || !Array.isArray(action.lines) || action.lines.length === 0 || action.lines.length > 5) return null;
      // Sending a sheet whose totals don't match the dock schedule: the system warns once.
      if (!s.data.deduped && !action.sendAnyway) {
        return s.data.prompted ? null : { ...s, data: { ...s.data, prompted: true } };
      }
      return tick({ ...s, data: { ...s.data, report: { lines: action.lines, inconsistent: !s.data.deduped } } }, 10);
    }

    case "escalate":
      if (s.scene !== "data" || !s.data.report || s.data.escalation) return null;
      return enter({ ...s, data: { ...s.data, escalation: action.id } }, "peak", at);

    /* ── Peak ── */

    case "peakPlan": {
      if (s.scene !== "peak" || s.peak.buckets) return null;
      const buckets = action.buckets;
      const items = ["overrun", "megaLate", "backlog", "spiceGrn", "tempLog"] as const;
      if (!items.every((id) => ["now", "delegate", "reschedule", "escalate"].includes(buckets?.[id]))) return null;
      if (items.filter((id) => buckets[id] === "now").length > 2) return null;
      let next: FcState = { ...s, peak: { ...s.peak, buckets: { ...buckets } } };
      const jobOf = { backlog: "putawayBacklog", spiceGrn: "spiceGrn", tempLog: "tempLog" } as const;
      for (const id of ["backlog", "spiceGrn", "tempLog"] as const) {
        if (buckets[id] === "now") next = owned(next, jobOf[id], "me");
        if (buckets[id] === "delegate") next = owned(next, jobOf[id], SUITED[jobOf[id]][0]!);
      }
      return tick(next, 5);
    }

    case "vendorReply":
      if (s.scene !== "peak" || !s.peak.buckets || s.peak.vendorReply) return null;
      return tick({ ...s, peak: { ...s.peak, vendorReply: action.id } }, 5);

    case "procurement":
      if (s.scene !== "peak" || !s.peak.vendorReply || s.peak.procurement) return null;
      return enter({ ...s, peak: { ...s.peak, procurement: action.id } }, "outcome", at);

    case "finish":
      if (s.scene !== "outcome") return null;
      return { ...s, scene: "done" };
  }
  return null;
}

export function reduce(state: FcState, stamped: Stamped): FcState {
  if (state.scene === "done" || !stamped?.a || typeof stamped.a !== "object") return state;
  const at = Math.max(0, Math.round(Number(stamped.at) || 0));
  const next = apply(state, stamped.a, at);
  if (!next) return state;
  const seq = state.seq + 1;
  return {
    ...next,
    seq,
    log: [...next.log, { seq, scene: state.scene, eventType: stamped.a.t, realMs: at, simTime: next.clock, action: stamped.a }].slice(-300),
  };
}

export function replay(actions: Stamped[]): FcState {
  return (Array.isArray(actions) ? actions : []).reduce(reduce, initialState());
}

/** Time is up: the shift closes on what was done. */
export function expire(state: FcState): FcState {
  if (state.scene === "done") return state;
  return { ...state, expiredIn: state.scene, scene: "done" };
}

/** Free docks for a truck at a given start, for the board's hints. */
export function openDocks(state: FcState, v: VehicleId, start: number): DockId[] {
  return DOCKS.filter((dock) => canPlace(state, v, dock, start));
}

export const personName = (id: PersonId) => PERSON[id].name;

/** What the morning came to, in the store's terms. Never labelled right or wrong. */
export function outcomeOf(state: FcState): { title: string; lines: string[] } {
  const plan = state.finalPlan ?? state.board;
  const placed = (Object.keys(plan) as VehicleId[]).length;
  const lines = [
    `${placed} truck${placed === 1 ? "" : "s"} unloaded on the docks this morning.`,
    state.receive.grn ? `FreshFarm GRN: ${state.receive.grn.qty} crates.` : "FreshFarm: no GRN made.",
    state.disc.decision ? `Crunchy Snacks: ${state.disc.decision.short} short, ${state.disc.decision.damaged} damaged, ${state.disc.decision.unscannable} unscannable.` : "Crunchy Snacks: discrepancy not closed.",
    state.data.report ? "Shift update sent." : "No shift update sent.",
  ];
  return { title: state.expiredIn ? "Time ran out" : "Shift handed over at 12:00", lines };
}
