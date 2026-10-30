import { formFor, handoverFloor, handoverLocks } from "./forms";
import {
  CTD_TARGET,
  END_AT,
  PEAK_AT,
  SCHEDULE,
  STANDBY_AT,
  TEMP_AT,
  advanceTo,
  aisleBlocked,
  capacityOf,
  coverageOf,
  flexibleReserve,
  isFree,
  isLocked,
  isPresent,
  metricsOf,
  outputOf,
  perishablesDone,
  projectedPeak,
  roleFit,
  staffAt,
  suitedAndFree,
  taskFit,
  weakestStage,
} from "./model";
import { AGENCY_COST, AGENCY_MAX, BY_ID, ROSTER, STATION_LABEL, STATION_PLACE, nameOf } from "./roster";
import {
  STAGES,
  STATIONS,
  type Action,
  type FinalTask,
  type FormId,
  type HiringState,
  type Intervention,
  type Owner,
  type SceneId,
  type Stage,
  type Stamped,
  type Station,
  type TaskKind,
} from "./types";

/**
 * The shift.
 *
 * A pure function from what the candidate did to what the store became. There
 * is one store, and every decision changes it: the floor built in the first
 * four minutes — and the devices locked or left open in it — is the floor that
 * meets the surge at 06:09, the person sent to recount the cage is not picking
 * while they do it, and the associate who was threatened at 06:04 covers a
 * second workflow at 06:18 at three-quarters speed.
 *
 * Nothing in here knows what a good answer is. That is the scorer's job, and
 * it only ever reads what this file recorded.
 */

/** Riya's induction keeps her on putaway; the board will not move her. Her device is her own scene. */
export const FIXED_ON_FLOOR = new Set(["riya"]);

export function initialState(form: FormId): HiringState {
  return {
    form,
    scene: "handover",
    clock: 0,
    expiry: null,
    arrivals: { handover: 0 },
    assign: handoverFloor(form),
    locks: handoverLocks(form),
    busy: {},
    riders: { on: formFor(form).ridersOn, standby: false, standbyAt: null, desk: null },
    audit: { progress: 0, doneAt: null },
    flow: { pickQ: 3.5, stageQ: 0.4 },
    trace: [],
    maxCtd: 0,
    firstBreachAt: null,
    shocks: {
      aisleClearedAt: null,
      slowReleaseUntil: 0,
      lanes: [],
      managerOnBenchUntil: 0,
      inboundCleared: false,
      riders: "normal",
      extended: 0,
      shed: 0,
    },
    followUp: "open",
    trust: 62,
    cost: 0,
    handover: [],
    floor: null,
    absence: null,
    tempArrivesAt: null,
    agency: 0,
    riya: { inspected: false, choices: null, pairUntil: 0, pairPartner: null, leftAt: null },
    arjun: { place: null, checked: [], response: null, outcome: "pending", unsupportedPromise: false },
    kase: {
      stage: "alert",
      firstMove: null,
      countOwner: null,
      countDoneAt: null,
      viewed: [],
      recordsOwner: null,
      recordsDoneAt: null,
      interrupt: null,
      disposition: null,
      openedAt: 0,
    },
    nil: { viewed: [], searchOwner: null, searchDoneAt: null, outcome: null, searchedBefore: false },
    triage: null,
    triageAt: null,
    bn: {
      coverageAtStart: null,
      constraintAtStart: null,
      blamed: null,
      origins: {},
      viewed: [],
      viewedBeforeAct: [],
      reply: null,
      moves: [],
      ranAt: null,
      before: null,
      after: null,
      effectChecked: false,
    },
    bag: null,
    tasksOffered: [],
    plan: null,
    teamAtFinal: [],
    outcome: null,
    delegations: [],
    personal: [],
    constraintActs: [],
    inspections: [],
    log: [],
  };
}

/* ── Derived views the screens need ───────────────────────────────────── */

export const CASE_TOOLS = ["movement", "orders", "scan", "access", "exception"] as const;
export const HANDOVER_CHECKS = ["team", "riders", "floorwalk", "perishables", "audits", "demand"] as const;
export const NIL_SOURCES = ["overstock", "replenArea", "adjacentBin", "transactions"] as const;
export const BN_PANELS = ["bnPicking", "bnShelf", "bnRiders", "bnDevices", "bnAisle", "bnQueue"] as const;

export function countKnown(state: HiringState): boolean {
  return state.kase.countDoneAt !== null && state.kase.countDoneAt <= state.clock;
}

/** Which records the candidate has actually seen, by either route. */
export function recordsSeen(state: HiringState): string[] {
  const delivered =
    state.kase.recordsDoneAt !== null && state.kase.recordsDoneAt <= state.clock;
  return delivered ? [...CASE_TOOLS] : state.kase.viewed;
}

/** The two units that can be explained, and whether the evidence is in hand. */
export function unitEvidence(state: HiringState): { unit1: boolean; unit2: boolean } {
  const seen = recordsSeen(state);
  return {
    unit1: seen.includes("orders") && seen.includes("scan"),
    unit2: seen.includes("movement") && seen.includes("exception"),
  };
}

export function interruptDue(state: HiringState): boolean {
  return (
    state.scene === "case" &&
    state.kase.stage === "open" &&
    state.kase.interrupt === null &&
    state.clock >= state.kase.openedAt + 180
  );
}

export function nilFound(state: HiringState): boolean {
  return (
    state.nil.viewed.includes("replenArea") ||
    (state.nil.searchDoneAt !== null && state.nil.searchDoneAt <= state.clock)
  );
}

/** Anything a candidate is waiting on, soonest first. */
export function pendingUntil(state: HiringState): number | null {
  const times = [state.kase.countDoneAt, state.kase.recordsDoneAt, state.nil.searchDoneAt].filter(
    (time): time is number => time !== null && time > state.clock,
  );
  return times.length ? Math.min(...times) : null;
}

/**
 * The bag on the staging shelf. It has been waiting on a rider, so it is at
 * the edge of target on the calmest morning and well past it on a bad one; and
 * repacking takes longer where the pickers are already stretched.
 */
export function bagClock(state: HiringState): { now: number; penalty: number } {
  return {
    now: Math.max(metricsOf(state).ctd, 172) + 6,
    penalty: coverageOf(state, "picking") < 0.95 ? 17 : 12,
  };
}

/* ── Bookkeeping ──────────────────────────────────────────────────────── */

function spend(state: HiringState, seconds: number): void {
  advanceTo(state, state.clock + seconds);
}

function enter(state: HiringState, scene: SceneId): void {
  state.scene = scene;
  advanceTo(state, Math.max(state.clock, SCHEDULE[scene]));
  state.arrivals[scene] = state.clock;

  if (scene === "case") state.kase.openedAt = state.clock;
  if (scene === "triage") state.triageAt = metricsOf(state);
  if (scene === "bottleneck") {
    state.bn.coverageAtStart = Object.fromEntries(
      STAGES.map((stage) => [stage, coverageOf(state, stage)]),
    ) as Record<Stage, number>;
    state.bn.constraintAtStart = weakestStage(state);
    state.bn.blamed = state.bn.constraintAtStart === "picking" ? "putaway" : "picking";
    state.bn.before = metricsOf(state);
  }
  if (scene === "final") {
    state.tasksOffered = buildFinalTasks(state);
    state.teamAtFinal = teamSnapshot(state);
  }
}

/** The manager did something with their own hands. */
function personal(
  state: HiringState,
  task: string,
  label: string,
  kind: TaskKind | null,
): void {
  state.personal.push({
    task,
    label,
    delegable: kind !== null,
    fitAvailable: kind !== null && suitedAndFree(state, kind),
    at: state.clock,
    scene: state.scene,
  });
}

/**
 * Work that belongs to a workflow. Somebody already on it does it as part of
 * the job; anybody else has to leave their own work to do it.
 */
const OWN_WORK: Partial<Record<Station, TaskKind[]>> = {
  putaway: ["search", "replenish", "inbound", "aisle"],
  auditing: ["count", "records", "followUp", "audit", "perishables"],
  picking: ["repack"],
};

/** Does this job take this person away from where they are standing? */
export function leavesStation(state: HiringState, id: string, kind: TaskKind): boolean {
  const station = state.assign[id];
  return station === undefined || !(OWN_WORK[station] ?? []).includes(kind);
}

/** Somebody was given a piece of work, and is off their station while they do it. */
function delegate(
  state: HiringState,
  task: string,
  label: string,
  owner: string,
  kind: TaskKind,
  slower = 1,
): number {
  const { fit, seconds } = taskFit(owner, kind);
  const duration = Math.round(seconds * slower);
  state.delegations.push({
    task,
    label,
    owner,
    fit,
    appropriate: fit >= 0.8 && isFree(state, owner),
    at: state.clock,
    scene: state.scene,
  });
  if (owner in state.assign && leavesStation(state, owner, kind)) {
    state.busy[owner] = { until: state.clock + duration, task };
  }
  return state.clock + duration;
}

/** Book, change or cancel agency staff. Each is paid for four hours whether or not the rush lasts that long. */
function bookAgency(state: HiringState, wanted: number): void {
  const count = Math.max(0, Math.min(AGENCY_MAX, Math.round(wanted)));
  state.cost += (count - state.agency) * AGENCY_COST;
  state.agency = count;
  state.tempArrivesAt = count > 0 ? TEMP_AT : null; // 06:20
}

/** Something was done about the stage that is stuck. */
function actedOnConstraint(state: HiringState, stage: Stage): void {
  if (stage === formFor(state.form).constraint || stage === state.bn.constraintAtStart) {
    state.constraintActs.push({ at: state.clock, ctd: metricsOf(state).ctd, where: state.scene });
  }
}

/**
 * Somebody was moved to do something else. A device that changes role comes
 * up unlocked, as the app leaves it; `lock` is for the manager who is sending
 * somebody to a job and means them to stay on it.
 */
function move(state: HiringState, emp: string, to: Station, asDelegation: string | null, lock = false): void {
  if (!(emp in state.assign) || FIXED_ON_FLOOR.has(emp)) return;
  state.assign[emp] = to;
  if (lock && to !== "picking") state.locks[emp] = true;
  else delete state.locks[emp];
  actedOnConstraint(state, to);
  if (asDelegation) {
    const skill = BY_ID[emp]?.skills[to] ?? 0;
    state.delegations.push({
      task: asDelegation,
      label: `${STATION_LABEL[to]} support`,
      owner: emp,
      fit: Math.min(1, skill),
      appropriate: skill >= 0.8,
      at: state.clock,
      scene: state.scene,
    });
  }
}

/** Somebody was put on the handover point to sequence the riders. */
function riderDesk(state: HiringState, emp: string, asDelegation: string | null): void {
  if (!(emp in state.assign) || FIXED_ON_FLOOR.has(emp) || state.riders.desk) return;
  const trained = BY_ID[emp]?.auth.riders ?? false;
  state.riders.desk = emp;
  state.busy[emp] = { until: END_AT, task: "riders" };
  actedOnConstraint(state, "riders");
  if (asDelegation) {
    state.delegations.push({
      task: asDelegation,
      label: "Rider handover",
      owner: emp,
      fit: trained ? 1 : 0.4,
      appropriate: trained,
      at: state.clock,
      scene: state.scene,
    });
  }
}

/** Put somebody on the stage that is stuck, and keep them there. */
function reinforce(state: HiringState, emp: string, stage: Stage, asDelegation: string | null): void {
  if (stage === "riders") riderDesk(state, emp, asDelegation);
  else move(state, emp, stage, asDelegation, true);
}

function clearAisle(state: HiringState, owner: Owner): void {
  if (!aisleBlocked(state) && state.shocks.aisleClearedAt !== null) return;
  if (owner === "me") {
    personal(state, "aisle", "Cleared Aisle C personally", "aisle");
    spend(state, 240);
    state.shocks.aisleClearedAt = state.clock;
  } else {
    state.shocks.aisleClearedAt = delegate(state, "aisle", "Clear Aisle C", owner, "aisle");
  }
}

function teamSnapshot(state: HiringState): HiringState["teamAtFinal"] {
  return Object.keys(state.assign).map((id) => {
    const busy = state.busy[id];
    const station = state.assign[id]!;
    const load = Math.min(1.25, 1 / Math.max(0.4, coverageOf(state, station)));
    return {
      id,
      where: busy && busy.until > state.clock ? busy.task : station,
      load: Math.round(load * 100),
    };
  });
}

/* ── The final call's task list ───────────────────────────────────────── */

function buildFinalTasks(state: HiringState): FinalTask[] {
  const form = formFor(state.form);
  const now = metricsOf(state);
  const tasks: FinalTask[] = [];
  const constraint = form.constraint;

  if (now.coverage[constraint] < 0.97) {
    tasks.push({
      id: "constraint",
      title: form.surgeHeadline,
      detail: `${STATION_LABEL[constraint]} ${constraint === "riders" ? "are" : "is"} at ${Math.round(now.coverage[constraint] * 100)}% of what the rush needs.`,
      urgent: true,
      managerLevel: false,
      kind: null,
    });
  }

  const controlled = state.kase.disposition?.steps.includes("controlAccess") ?? false;
  const escalated = state.kase.disposition?.steps.includes("escalate") ?? false;
  if (state.followUp !== "done" || !escalated) {
    tasks.push({
      id: "variance",
      title: `${form.highValue.item}: missing items`,
      detail:
        state.kase.stage === "deferred"
          ? "Still not counted. The system and the cage do not match."
          : controlled
            ? "One item is still missing. The cage is opened only with a supervisor. The evidence is not put together yet."
            : "One item is still missing, and anyone can still open the cage.",
      urgent: !controlled,
      managerLevel: true,
      kind: "followUp",
    });
  }

  const gone = state.assign.riya === undefined;
  const onOrders = state.assign.riya === "picking";
  tasks.push({
    id: "riyaCoaching",
    title: gone ? "Agency: a new worker instead of Riya" : onOrders ? "Riya: talk about the picking target" : "Riya: show her where the bins are",
    detail: gone
      ? "She was sent back on her second day. The agency wants the reason in writing."
      : onOrders
        ? "She was put on orders with a target on her second day. She has asked if she should come back tomorrow."
        : "20 minutes at the racks with someone who knows them, before her first picking shift.",
    urgent: false,
    managerLevel: false,
    kind: "coaching",
  });

  tasks.push({
    id: "audit",
    title: "Full store count",
    detail: "The area office wants every item in the store counted this week.",
    urgent: false,
    managerLevel: false,
    kind: "audit",
  });

  if (!perishablesDone(state)) {
    tasks.push({
      id: "perishables",
      title: "Fresh food check not finished",
      detail: "Not all the milk, bread, eggs, fruit and vegetables are checked for date and quality. They are selling now.",
      urgent: true,
      managerLevel: false,
      kind: "perishables",
    });
  }

  const shelf = now.coverage.putaway;
  tasks.push({
    id: "inbound",
    title: "New crates in receiving",
    detail:
      shelf < 0.85
        ? "Crates from the main warehouse are still in the receiving area. Fast-selling items are running low in the bins."
        : "Crates from the main warehouse are still in the receiving area. The bins are full enough for now.",
    urgent: shelf < 0.85,
    managerLevel: false,
    kind: "inbound",
  });

  tasks.push({
    id: "riders",
    title: "Riders are late",
    detail: "Two riders are late coming back from their last trip. The order in which bags go out must be changed.",
    urgent: true,
    managerLevel: false,
    kind: "riders",
  });

  if (state.nil.outcome && state.nil.outcome !== "replenished") {
    tasks.push({
      id: "nilRecon",
      title: "Item not found: fix the stock",
      detail: `${form.nilPick.item}: the system and the shelf bin still do not match.`,
      urgent: false,
      managerLevel: false,
      kind: "search",
    });
  }

  const late = Math.max(2, Math.round((state.maxCtd - 150) / 12));
  tasks.push({
    id: "lateOrder",
    title: "Order #5521 will be late",
    detail: `About ${late} minutes late. Nobody has told the customer.`,
    urgent: true,
    managerLevel: false,
    kind: "lateOrder",
  });

  if (aisleBlocked(state)) {
    tasks.push({
      id: "aisle",
      title: "Aisle C is still blocked",
      detail: "Pickers are walking around the crates. Every walk through Aisle C takes a third longer.",
      urgent: true,
      managerLevel: false,
      kind: "aisle",
    });
  }

  return tasks;
}

/* ── The reducer ──────────────────────────────────────────────────────── */

function apply(state: HiringState, action: Action): string[] {
  const tags: string[] = [];
  const form = formFor(state.form);

  switch (action.t) {
    /* ── Looking at something ─────────────────────────────────────── */
    case "inspect": {
      state.inspections.push({ item: action.item, scene: state.scene, at: state.clock });

      if (state.scene === "handover") {
        if (!state.handover.includes(action.item)) state.handover.push(action.item);
      } else if (action.item === "riyaNumbers") {
        if (!state.riya.inspected) spend(state, 40);
        state.riya.inspected = true;
      } else if (action.item === "incentiveStatus" || action.item === "eligibility") {
        if (!state.arjun.checked.includes(action.item)) {
          state.arjun.checked.push(action.item);
          spend(state, 40);
        }
      } else if ((CASE_TOOLS as readonly string[]).includes(action.item)) {
        if (state.scene === "case" && !state.kase.viewed.includes(action.item)) {
          state.kase.firstMove ??= "records";
          if (state.kase.stage === "alert") state.kase.stage = "open";
          if (state.kase.viewed.length === 0) {
            personal(state, "records", "Went through the records personally", "records");
          }
          state.kase.viewed.push(action.item);
          spend(state, 50);
        }
      } else if ((NIL_SOURCES as readonly string[]).includes(action.item)) {
        if (!state.nil.viewed.includes(action.item)) {
          if (state.nil.viewed.length === 0) {
            personal(state, "search", "Searched for the stock personally", "search");
          }
          state.nil.viewed.push(action.item);
          state.nil.searchedBefore = true;
          spend(state, 40);
        }
      } else if ((BN_PANELS as readonly string[]).includes(action.item)) {
        if (!state.bn.viewed.includes(action.item)) {
          state.bn.viewed.push(action.item);
          if (state.bn.moves.length === 0) state.bn.viewedBeforeAct.push(action.item);
          spend(state, 30);
        }
      } else if (action.item === "bnEffect") {
        if (state.bn.ranAt !== null && !state.bn.effectChecked) {
          state.bn.effectChecked = true;
          spend(state, 30);
        }
      }
      break;
    }

    /* ── Handover and the floor ───────────────────────────────────── */
    case "takeShift":
      if (state.scene === "handover") enter(state, "floor");
      break;

    case "assign":
      if (state.scene === "floor" || state.scene === "absence") {
        if (action.emp in state.assign && !FIXED_ON_FLOOR.has(action.emp) && state.assign[action.emp] !== action.to) {
          state.assign[action.emp] = action.to;
          // A device that changes role comes up unlocked.
          delete state.locks[action.emp];
        }
      }
      break;

    case "lock":
      if (state.scene === "floor" || state.scene === "absence") {
        if (action.emp in state.assign && !FIXED_ON_FLOOR.has(action.emp) && state.assign[action.emp] !== "picking") {
          if (action.locked) state.locks[action.emp] = true;
          else delete state.locks[action.emp];
        }
      }
      break;

    case "agency":
      // Extra hands from the staffing agency, by the hour. Booked from the floor board.
      if (state.scene === "floor" || state.scene === "absence") bookAgency(state, action.count);
      break;

    case "standby":
      if (state.scene === "floor" || state.scene === "absence") {
        if (action.on !== state.riders.standby) state.cost += action.on ? 300 : -300;
        state.riders.standby = action.on;
        state.riders.standbyAt = action.on ? STANDBY_AT : null;
      }
      break;

    case "lockFloor": {
      if (state.scene !== "floor") break;
      state.floor = {
        lockedAt: state.clock,
        projected: projectedPeak(state),
        fit: roleFit(state),
        reserve: flexibleReserve(state),
        uncovered: STATIONS.filter((station) => staffAt(state, station).length === 0),
      };
      enter(state, "absence");
      break;
    }

    case "absence": {
      if (state.scene !== "absence") break;
      // The staffing decision is settled here: whatever was booked on the floor
      // board stands if agency cover is part of it, and is cancelled if it is not.
      bookAgency(state, action.choices.includes("onDemand") ? Math.max(1, state.agency) : 0);
      const projected = projectedPeak(state, action.choices.includes("extend"));
      state.absence = {
        choices: action.choices,
        // Auditing is meant to give way in a rush. The three that carry an order are not.
        projectedMin: Math.min(projected.picking, projected.putaway, projected.riders),
        pickingProjected: projected.picking,
        at: state.clock,
      };
      // The floor is re-read here: this is the team that goes into the morning.
      if (state.floor) {
        state.floor.reserve = flexibleReserve(state);
        state.floor.fit = roleFit(state);
        state.floor.projected = projectedPeak(state);
        state.floor.uncovered = STATIONS.filter((station) => staffAt(state, station).length === 0);
      }
      spend(state, 45);
      enter(state, "riya");
      break;
    }

    /* ── Riya ─────────────────────────────────────────────────────── */
    case "riya": {
      if (state.scene !== "riya") break;
      const choices = action.choices.slice(0, 2);
      state.riya.choices = choices;

      if (choices.includes("returnAgency")) {
        // Gone, today. Putaway loses the hand it had.
        delete state.assign.riya;
        delete state.locks.riya;
        state.trust -= 6;
      } else if (choices.includes("target")) {
        state.assign.riya = "picking";
        delete state.locks.riya;
        state.trust -= 3;
      } else {
        // Somebody being shown the bins is on putaway, and her device says so.
        if (choices.includes("lockPutaway") || choices.includes("pair")) state.locks.riya = true;
        if (choices.includes("pair")) {
          const partner = staffAt(state, "putaway")
            .filter((id) => id !== "riya")
            .sort((a, b) => (BY_ID[b]?.skills.putaway ?? 0) - (BY_ID[a]?.skills.putaway ?? 0))[0];
          state.riya.pairPartner = partner ?? null;
          state.riya.pairUntil = state.clock + 600;
        }
      }
      if (choices.includes("warn")) state.trust -= 8;
      // A second-day joiner held to the sixteen-second item does not come back from her break.
      if (state.assign.riya && (choices.includes("target") || (choices.includes("warn") && !state.locks.riya))) {
        state.riya.leftAt = PEAK_AT + 300;
      }
      if (choices.includes("phaseLater") || choices.includes("lockPutaway") || choices.includes("pair")) {
        state.trust += 2;
      }
      spend(state, 60);
      enter(state, "arjun");
      break;
    }

    /* ── Arjun ────────────────────────────────────────────────────── */
    case "arjunPlace":
      if (state.scene !== "arjun" || state.arjun.place) break;
      state.arjun.place = action.place;
      if (action.place === "aside") spend(state, 30);
      // On the floor, the rest of the pickers hear every word of it.
      else state.trust -= 2;
      break;

    case "arjunRespond": {
      if (state.scene !== "arjun") break;
      const checked = state.arjun.checked.includes("incentiveStatus");
      // "Verified" without having checked is a guess with a confident face.
      const clarify = action.clarify === "verified" && !checked ? "guess" : action.clarify;
      state.arjun.response = { ...action, clarify };

      const points =
        { recognise: 2, neutral: 1, dismiss: -2 }[action.ack] +
        { verified: 3, willCheck: 2, guess: 0, deflect: -1, promise: 2 }[clarify] +
        (state.arjun.place === "aside" ? 1 : 0);

      if (clarify === "promise") state.arjun.unsupportedPromise = true;
      if (action.ack === "dismiss") state.trust -= 6;
      if (clarify === "deflect") state.trust -= 4;

      if (action.request === "none") {
        state.arjun.outcome = "leaving";
        if (points >= 3) state.trust += 4;
      } else if (action.request === "threat") {
        state.arjun.outcome = "resentful";
        state.trust -= 12;
      } else if (action.request === "order") {
        state.arjun.outcome = points >= 3 ? "reluctant" : "resentful";
        state.trust -= 5;
      } else {
        state.arjun.outcome = points >= 4 ? "willing" : points >= 1 ? "reluctant" : "leaving";
        state.trust += state.arjun.outcome === "willing" ? 8 : 2;
      }
      tags.push(`arjun:${state.arjun.outcome}`);
      spend(state, 60);
      enter(state, "case");
      break;
    }

    /* ── The high-value case ──────────────────────────────────────── */
    case "startCount": {
      if (state.scene !== "case" || state.kase.countOwner !== null) break;
      state.kase.firstMove ??= "count";
      state.kase.countOwner = action.owner;
      state.kase.stage = "open";
      if (action.owner === "me") {
        personal(state, "count", "Recounted the cage personally", "count");
        spend(state, 300);
        state.kase.countDoneAt = state.clock;
      } else {
        state.kase.countDoneAt = delegate(state, "count", "High-value recount", action.owner, "count");
        spend(state, 20);
      }
      break;
    }

    case "deferCase":
      if (state.scene !== "case") break;
      state.kase.firstMove ??= "defer";
      state.kase.stage = "deferred";
      enter(state, "nilpick");
      break;

    case "pullRecords": {
      if (state.scene !== "case" || state.kase.recordsOwner) break;
      state.kase.firstMove ??= "records";
      if (state.kase.stage === "alert") state.kase.stage = "open";
      state.kase.recordsOwner = action.owner;
      state.kase.recordsDoneAt = delegate(state, "records", "Pull the records", action.owner, "records");
      spend(state, 20);
      break;
    }

    case "caseInterrupt": {
      if (state.scene !== "case" || state.kase.interrupt) break;
      const now = metricsOf(state);
      state.kase.interrupt = {
        choice: action.choice,
        at: state.clock,
        ordersWaiting: now.ordersWaiting,
        ctd: now.ctd,
      };
      if (action.choice === "handOver" && action.owner && !state.kase.recordsOwner) {
        state.kase.recordsOwner = action.owner;
        state.kase.recordsDoneAt = delegate(state, "records", "Pull the records", action.owner, "records");
        spend(state, 20);
      }
      if (action.choice === "stepOut" && action.move) {
        reinforce(state, action.move, form.constraint, null);
        spend(state, 60);
      }
      break;
    }

    case "wait": {
      const until = pendingUntil(state);
      if (until !== null) advanceTo(state, until);
      else spend(state, 30);
      break;
    }

    case "disposition": {
      if (state.scene !== "case" || state.kase.stage !== "open" || state.kase.countOwner === null) break;
      if (state.kase.countDoneAt !== null && state.kase.countDoneAt > state.clock) {
        advanceTo(state, state.kase.countDoneAt);
      }
      state.kase.disposition = action;
      state.kase.stage = "closed";
      if (action.steps.includes("accuse")) state.trust -= 12;
      if (action.steps.includes("closeStore")) {
        // Stopping the store to look for one unit stops the store.
        state.shocks.slowReleaseUntil = state.clock + 480;
        state.trust -= 3;
      }
      if (action.steps.includes("escalate") && action.steps.includes("preserve")) {
        state.followUp = "done";
      }
      spend(state, 60);
      enter(state, "nilpick");
      break;
    }

    /* ── Nil pick ─────────────────────────────────────────────────── */
    case "nilSearch": {
      if (state.scene !== "nilpick" || state.nil.searchOwner !== null) break;
      state.nil.searchOwner = action.owner;
      state.nil.searchedBefore = true;
      if (action.owner === "me") {
        personal(state, "search", "Searched for the stock personally", "search");
        spend(state, 150);
        state.nil.searchDoneAt = state.clock;
      } else {
        // With putaway already behind, there is nobody free to look.
        const thin = coverageOf(state, "putaway") < 0.8 ? 2 : 1;
        state.nil.searchDoneAt = delegate(
          state,
          "search",
          `Find the ${form.nilPick.item}`,
          action.owner,
          "search",
          thin,
        );
        spend(state, 20);
      }
      break;
    }

    case "nilResolve": {
      if (state.scene !== "nilpick" || state.nil.outcome) break;
      if (action.how === "replenish") {
        if (state.nil.searchDoneAt !== null && state.nil.searchDoneAt > state.clock) {
          advanceTo(state, state.nil.searchDoneAt);
        }
        if (!nilFound(state)) break;
        if (!action.owner || action.owner === "me") {
          personal(state, "replenish", "Put the crate away personally", "replenish");
          spend(state, 120);
        } else {
          delegate(state, "replenish", `Put away the ${form.nilPick.item}`, action.owner, "replenish");
          spend(state, 20);
        }
        state.nil.outcome = "replenished";
      } else {
        state.nil.outcome =
          action.how === "authorise" ? "authorised" : action.how === "delist" ? "delisted" : "ignored";
        spend(state, 20);
      }
      enter(state, "triage");
      break;
    }

    /* ── Three problems, one manager ──────────────────────────────── */
    case "triage": {
      if (state.scene !== "triage" || state.triage) break;
      // One pair of hands. A second "handle" is a thing that did not happen.
      let slot = true;
      const take = (mode: string) => {
        if (mode !== "handle") return mode;
        if (slot) {
          slot = false;
          return "handle";
        }
        tags.push("attention:saturated");
        return "later";
      };
      const constraint = { ...action.constraint, mode: take(action.constraint.mode) };
      const followUp = { ...action.followUp, mode: take(action.followUp.mode) };
      const aisle = { ...action.aisle, mode: take(action.aisle.mode) };
      state.triage = { t: "triage", constraint, aisle, followUp } as typeof action;

      // Delegations go out first: they cost a sentence each.
      if (constraint.mode === "delegate" && constraint.owner) {
        reinforce(state, constraint.owner, form.constraint, "constraintSupport");
      }
      if (aisle.mode === "delegate" && aisle.owner) clearAisle(state, aisle.owner);
      if (followUp.mode === "delegate" && followUp.owner) {
        delegate(state, "followUp", "Evidence pack for the variance", followUp.owner, "followUp");
        state.followUp = "delegated";
      }
      spend(state, 30);

      if (constraint.mode === "handle") {
        const benchKind =
          form.constraint === "putaway" ? "inbound" : form.constraint === "riders" ? "riders" : "repack";
        personal(state, "bench", `Worked the ${STATION_PLACE[form.constraint]} personally`, benchKind);
        state.shocks.managerOnBenchUntil = state.clock + 360;
        state.constraintActs.push({ at: state.clock, ctd: metricsOf(state).ctd, where: "triage" });
        spend(state, 210);
      } else if (aisle.mode === "handle") {
        clearAisle(state, "me");
      } else if (followUp.mode === "handle") {
        // Escalating a loss is the manager's to do. Nobody else can sign it.
        personal(state, "followUp", "Wrote the escalation personally", null);
        spend(state, 120);
        state.followUp = "done";
      }
      enter(state, "bottleneck");
      break;
    }

    /* ── The bottleneck ───────────────────────────────────────────── */
    case "floorLeadReply":
      if (state.scene === "bottleneck") state.bn.reply = action.call;
      break;

    case "intervene": {
      if (state.scene !== "bottleneck") break;
      for (const step of action.moves) applyIntervention(state, step);
      state.bn.moves.push(...action.moves);
      spend(state, 45);
      break;
    }

    case "runSystem":
      if (state.scene !== "bottleneck" || state.bn.ranAt !== null) break;
      spend(state, 180);
      state.bn.ranAt = state.clock;
      state.bn.after = metricsOf(state);
      break;

    /* ── The bag ──────────────────────────────────────────────────── */
    case "bag": {
      if (state.scene !== "customer" || state.bag) break;
      const clock = bagClock(state);
      const before = clock.now;
      const penalty = action.by === "unchanged" ? 0 : clock.penalty;
      if (action.by === "me") {
        personal(state, "repack", "Repacked the bag personally", "repack");
        spend(state, 90);
      } else if (action.by !== "unchanged") {
        delegate(state, "repack", "Repack the bag at staging", action.by, "repack");
        spend(state, 15);
      }
      state.bag = {
        cleanerBag: action.cleanerBag,
        cleanerLiner: action.cleanerLiner,
        by: action.by,
        ctdBefore: before,
        ctdAfter: before + penalty,
        at: state.clock,
      };
      enter(state, "final");
      break;
    }

    /* ── The final call ───────────────────────────────────────────── */
    case "plan": {
      if (state.scene !== "final" || state.plan) break;
      const plan: NonNullable<HiringState["plan"]> = {};
      let now = 0;
      let handed = 0;
      for (const task of state.tasksOffered) {
        const entry = action.tasks[task.id] ?? { bucket: "later" as const };
        let bucket = entry.bucket;
        if (bucket === "now" && ++now > 3) bucket = "later";
        if (bucket === "delegate" && (!entry.owner || ++handed > 3)) bucket = "later";
        plan[task.id] = { ...entry, bucket };
      }
      state.plan = plan;
      applyPlan(state, plan);
      spend(state, 60);
      enter(state, "outcome");
      runOutcome(state);
      break;
    }

    case "next": {
      // Only the scenes with no closing decision of their own move on this way.
      if (state.scene === "bottleneck") enter(state, "customer");
      else if (state.scene === "outcome") state.scene = "done";
      break;
    }
  }

  return tags;
}

function applyIntervention(state: HiringState, step: Intervention): void {
  switch (step.kind) {
    case "move":
      if (state.assign[step.emp] !== undefined) state.bn.origins[step.emp] ??= state.assign[step.emp]!;
      move(state, step.emp, step.to, "bottleneckMove");
      break;
    case "lock": {
      const station = state.assign[step.emp];
      if (station === undefined || station === "picking" || FIXED_ON_FLOOR.has(step.emp)) break;
      if (step.locked === isLocked(state, step.emp)) break;
      if (step.locked) state.locks[step.emp] = true;
      else delete state.locks[step.emp];
      // Opening a device adds a picker in a rush; closing one keeps a hand on its own work.
      actedOnConstraint(state, step.locked ? station : "picking");
      break;
    }
    case "addSlot":
      if (step.station === "picking" || state.shocks.lanes.includes(step.station)) break;
      state.shocks.lanes.push(step.station);
      actedOnConstraint(state, step.station);
      break;
    case "riderDesk":
      riderDesk(state, step.emp, "bottleneckMove");
      break;
    case "standby":
      if (state.riders.standby) break;
      state.riders.standby = true;
      // Called now, they are eight minutes away.
      state.riders.standbyAt = state.clock + 480;
      state.cost += 300;
      actedOnConstraint(state, "riders");
      break;
    case "clearAisle":
      clearAisle(state, step.owner);
      break;
    case "slowRelease":
      state.shocks.slowReleaseUntil = state.clock + 600;
      break;
  }
}

function applyPlan(state: HiringState, plan: NonNullable<HiringState["plan"]>): void {
  const form = formFor(state.form);

  for (const task of state.tasksOffered) {
    const entry = plan[task.id]!;
    const owner = entry.owner;

    if (entry.bucket === "now") {
      personal(state, `plan:${task.id}`, `Took "${task.title}" personally`, task.managerLevel ? null : task.kind ?? "repack");
    } else if (entry.bucket === "delegate" && owner && task.kind && task.id !== "constraint") {
      delegate(state, `plan:${task.id}`, task.title, owner, task.kind);
    }

    switch (task.id) {
      case "constraint":
        if (entry.bucket === "now") state.shocks.managerOnBenchUntil = END_AT;
        if (entry.bucket === "delegate" && owner) reinforce(state, owner, form.constraint, "plan:constraint");
        break;
      case "variance":
        if (entry.bucket === "now") state.followUp = "done";
        if (entry.bucket === "delegate") state.followUp = "delegated";
        break;
      case "riyaCoaching":
        // A walk-through in the peak takes the learner off the dock as well.
        if (entry.bucket !== "later" && state.assign.riya) {
          state.busy.riya = { until: state.clock + 420, task: "coaching" };
        }
        break;
      case "inbound":
        if (entry.bucket !== "later") state.shocks.inboundCleared = true;
        break;
      case "perishables":
        if (entry.bucket !== "later" && state.audit.doneAt === null) {
          state.audit.doneAt = state.clock + (owner ? taskFit(owner, "perishables").seconds : 360);
        }
        break;
      case "riders":
        state.shocks.riders = entry.bucket === "later" ? "gap" : "sequenced";
        break;
      case "aisle":
        if (entry.bucket === "now") state.shocks.aisleClearedAt = state.clock + 240;
        if (entry.bucket === "delegate" && owner) {
          state.shocks.aisleClearedAt = state.clock + taskFit(owner, "aisle").seconds;
        }
        break;
    }
  }
}

/** The twenty minutes after the plan is locked, run at speed. */
function runOutcome(state: HiringState): void {
  const form = formFor(state.form);
  const marks = [PEAK_AT + 300, PEAK_AT + 600, PEAK_AT + 840, END_AT];
  const events: NonNullable<HiringState["outcome"]>["events"] = [];
  const coverages: number[] = [];
  let riyaOutput = 0;
  let pickingAtPeak = 0;

  for (const mark of marks) {
    advanceTo(state, mark);
    const now = metricsOf(state);
    const critical = Math.min(now.coverage.picking, now.coverage.riders);
    coverages.push(Math.min(1, critical));

    if (mark === marks[0]) {
      pickingAtPeak = now.coverage.picking;
      const cover = now.coverage[form.constraint];
      events.push(
        cover >= 0.97
          ? { clock: mark, text: form.surgeOutcome.good, tone: "good" }
          : cover >= 0.85
            ? { clock: mark, text: form.surgeOutcome.warn, tone: "warn" }
            : { clock: mark, text: form.surgeOutcome.bad, tone: "bad" },
      );
    }

    if (mark === marks[0]) {
      events.push(
        state.audit.doneAt !== null && state.audit.doneAt <= PEAK_AT
          ? { clock: mark, text: "The fresh food check was finished before the rush. Two crates of old milk were taken out before any order.", tone: "good" }
          : { clock: mark, text: "The fresh food check was not finished before the rush. Old milk has gone out in orders.", tone: "bad" },
      );
    }

    if (mark === marks[1]) {
      const onPutaway = state.assign.riya === "putaway" && isPresent(state, "riya");
      riyaOutput = onPutaway && isLocked(state, "riya") && isFree(state, "riya") ? outputOf(state, "riya", "putaway") : 0;
      if (state.assign.riya === undefined) {
        events.push({ clock: mark, text: "Riya was sent back to the agency. Putaway is one person short.", tone: "warn" });
      } else if (!isPresent(state, "riya")) {
        events.push({ clock: mark, text: "Riya did not come back from her break. The agency says she is not returning.", tone: "bad" });
      } else if (state.assign.riya === "picking") {
        events.push({ clock: mark, text: "Riya is picking at 32 seconds per item. The target is 16 seconds.", tone: "warn" });
      } else if (!isLocked(state, "riya")) {
        events.push({ clock: mark, text: "Riya's device is still unlocked. The app sends her orders for bins she cannot find.", tone: "warn" });
      } else if (riyaOutput >= 0.8) {
        events.push({ clock: mark, text: "Riya is doing putaway almost as fast as a trained worker.", tone: "good" });
      } else {
        events.push({ clock: mark, text: "Riya is on putaway, learning the bins at her own speed.", tone: "neutral" });
      }
      if (state.arjun.outcome === "leaving") {
        events.push({ clock: mark, text: "Arjun went home at 06:30. Picking is slower without him.", tone: "warn" });
      } else if (state.arjun.outcome === "resentful") {
        events.push({ clock: mark, text: "Arjun stayed, but he does only what he is told, nothing more.", tone: "warn" });
      }
    }

    if (mark === marks[2]) {
      const steps = state.kase.disposition?.steps ?? [];
      if (state.kase.stage === "deferred") {
        events.push({ clock: mark, text: `${form.highValue.item}: the missing items are still not counted.`, tone: "bad" });
      } else if (steps.includes("writeOff") || steps.includes("accuse")) {
        events.push({ clock: mark, text: `${form.highValue.item}: the case was closed without finding out what happened.`, tone: "bad" });
      } else if (steps.includes("controlAccess") && state.followUp !== "open") {
        events.push({ clock: mark, text: `${form.highValue.item}: the cage is secure and the case is reported.`, tone: "good" });
      } else {
        events.push({ clock: mark, text: `${form.highValue.item}: the case is still open, and so is the cage.`, tone: "warn" });
      }
    }

    if (mark === END_AT) {
      events.push(
        now.ctd <= 180
          ? { clock: mark, text: "Dispatch time is back under the target.", tone: "good" }
          : now.ctd <= 200
            ? { clock: mark, text: `Dispatch time is ${now.ctd} seconds and going down.`, tone: "warn" }
            : state.shocks.extended > 0
              ? { clock: mark, text: `Dispatch time is ${now.ctd} seconds. The app gave customers a longer delivery time while the store was behind.`, tone: "bad" }
              : { clock: mark, text: `Dispatch time is ${now.ctd} seconds. The target is ${CTD_TARGET} seconds.`, tone: "bad" },
      );
    }
  }

  const finalCtd = metricsOf(state).ctd;
  const peakMax = Math.max(...state.trace.filter((point) => point.t >= PEAK_AT).map((point) => point.ctd), finalCtd);
  const title =
    finalCtd <= 180 && peakMax <= 205
      ? "PEAK UNDER CONTROL"
      : finalCtd <= 205
        ? "STORE BACK ON TRACK"
        : "STORE UNDER PRESSURE";

  state.outcome = {
    title,
    events,
    finalCtd,
    peakCoverage: coverages.reduce((sum, value) => sum + value, 0) / coverages.length,
    riyaOutput,
    pickingAtPeak,
  };
}

/* ── Public entry points ──────────────────────────────────────────────── */

/* ── What is allowed in ───────────────────────────────────────────────── */

const INSPECTABLE = new Set<string>([
  "riyaNumbers", "incentiveStatus", "eligibility", "bnEffect",
  ...HANDOVER_CHECKS, ...CASE_TOOLS, ...NIL_SOURCES, ...BN_PANELS,
]);
const RIYA_CHOICES = new Set(["lockPutaway", "pair", "phaseLater", "keep", "target", "returnAgency", "warn"]);
const ABSENCE_CHOICES = new Set(["onDemand", "reallocate", "extend", "short"]);
const UNIT_CALLS = new Set(["explained", "recovered", "unresolved", "writeoff", "theft"]);
const CASE_STEPS = new Set(["preserve", "controlAccess", "escalate", "accuse", "writeOff", "closeStore"]);
const CONTROL_FIXES = new Set(["scanAtIssue", "exceptionRestow", "remindTeam", "fullAudit"]);
const MODES = new Set(["handle", "delegate", "later"]);
const BUCKETS = new Set(["now", "delegate", "later"]);
const REPLIES = new Set<string>([...STAGES, "aisle", "unsure", "holding"]);

const isStation = (value: unknown): value is Station => STATIONS.includes(value as Station);
const isStage = (value: unknown): value is Stage => STAGES.includes(value as Stage);
const within = (set: Set<string>, values: unknown): values is string[] =>
  Array.isArray(values) && values.length <= 8 && values.every((value) => typeof value === "string" && set.has(value));

/**
 * The actions arrive from a browser, and later from a database row a browser
 * wrote. This is the one place that decides whether an action is something the
 * shift offers: a real person, a real station, a choice that exists. Anything
 * else is dropped, so nothing a candidate sends can put a string of their own
 * in front of an employer.
 */
function admissible(state: HiringState, action: Action): boolean {
  const person = (id: unknown) => typeof id === "string" && id in state.assign;
  const owner = (id: unknown) => id === "me" || person(id);
  const call = (value: { mode?: unknown; owner?: unknown } | undefined) =>
    value !== undefined && MODES.has(String(value.mode)) && (value.owner === undefined || person(value.owner));

  switch (action.t) {
    case "inspect":
      return INSPECTABLE.has(action.item);
    case "takeShift":
    case "lockFloor":
    case "deferCase":
    case "wait":
    case "runSystem":
    case "next":
      return true;
    case "assign":
      return person(action.emp) && isStation(action.to);
    case "lock":
      return person(action.emp) && typeof action.locked === "boolean";
    case "standby":
      return typeof action.on === "boolean";
    case "agency":
      return Number.isInteger(action.count) && action.count >= 0 && action.count <= AGENCY_MAX;
    case "absence":
      return within(ABSENCE_CHOICES, action.choices);
    case "riya":
      return within(RIYA_CHOICES, action.choices);
    case "arjunPlace":
      return action.place === "here" || action.place === "aside";
    case "arjunRespond":
      return (
        ["recognise", "neutral", "dismiss"].includes(action.ack) &&
        ["verified", "willCheck", "guess", "deflect", "promise"].includes(action.clarify) &&
        ["respectful", "order", "threat", "none"].includes(action.request)
      );
    case "startCount":
    case "nilSearch":
      return owner(action.owner);
    case "pullRecords":
      return person(action.owner);
    case "caseInterrupt":
      return (
        ["stay", "handOver", "stepOut"].includes(action.choice) &&
        (action.owner === undefined || person(action.owner)) &&
        (action.move === undefined || person(action.move))
      );
    case "disposition":
      return (
        within(UNIT_CALLS, action.units) && action.units.length === 3 &&
        within(CASE_STEPS, action.steps) && within(CONTROL_FIXES, action.controls)
      );
    case "nilResolve":
      return ["replenish", "authorise", "delist", "ignore"].includes(action.how) && (action.owner === undefined || owner(action.owner));
    case "triage":
      return call(action.constraint) && call(action.aisle) && call(action.followUp);
    case "floorLeadReply":
      return REPLIES.has(action.call);
    case "intervene":
      return (
        Array.isArray(action.moves) && action.moves.length <= 6 &&
        action.moves.every((step) =>
          step.kind === "move" ? person(step.emp) && isStation(step.to)
            : step.kind === "lock" ? person(step.emp) && typeof step.locked === "boolean"
              : step.kind === "addSlot" ? isStage(step.station)
                : step.kind === "riderDesk" ? person(step.emp)
                  : step.kind === "clearAisle" ? owner(step.owner)
                    : step.kind === "standby" || step.kind === "slowRelease")
      );
    case "bag":
      return (action.cleanerBag === 1 || action.cleanerBag === 2) && typeof action.cleanerLiner === "boolean" &&
        (action.by === "unchanged" || owner(action.by));
    case "plan":
      return (
        typeof action.tasks === "object" && action.tasks !== null &&
        Object.values(action.tasks).every((entry) =>
          BUCKETS.has(entry.bucket) && (entry.owner === undefined || person(entry.owner)) &&
          (entry.fix === undefined || ["informPriority", "voucher", "cancel"].includes(entry.fix)))
      );
    default:
      return false;
  }
}

export function reduce(previous: HiringState, stamped: Stamped): HiringState {
  if (previous.scene === "done") return previous;
  try {
    if (typeof stamped?.a?.t !== "string" || !admissible(previous, stamped.a)) return previous;
  } catch {
    return previous;
  }
  const state = structuredClone(previous);
  const before = metricsOf(state);
  const sceneBefore = state.scene;
  const clockBefore = state.clock;
  let tags: string[];
  try {
    tags = apply(state, stamped.a);
  } catch {
    // An action the store cannot make sense of is one that did not happen.
    return previous;
  }
  state.log.push({
    seq: state.log.length,
    realMs: stamped.at,
    simTime: clockBefore,
    simAfter: state.clock,
    scene: sceneBefore,
    eventType: stamped.a.t,
    entityId: entityOf(stamped.a),
    action: stamped.a,
    before,
    after: metricsOf(state),
    tags,
  });
  return state;
}

function entityOf(action: Action): string | undefined {
  if ("emp" in action) return action.emp;
  if ("owner" in action && typeof action.owner === "string") return action.owner;
  if ("item" in action) return action.item;
  return undefined;
}

export function replay(form: FormId, actions: Stamped[]): HiringState {
  return actions.reduce(reduce, initialState(form));
}

/**
 * The clock ran out. Whatever was decided stands, whatever was not is left
 * undecided, and the store runs on to 06:50 with the team as it is.
 */
export function expire(previous: HiringState): HiringState {
  if (previous.scene === "done" || previous.outcome) return { ...previous, scene: "done" };
  const state = structuredClone(previous);
  state.expiry = { scene: previous.scene, clock: state.clock, maxCtd: state.maxCtd, firstBreachAt: state.firstBreachAt };
  if (state.tasksOffered.length === 0) state.tasksOffered = buildFinalTasks(state);
  if (state.teamAtFinal.length === 0) state.teamAtFinal = teamSnapshot(state);
  state.scene = "outcome";
  advanceTo(state, Math.max(state.clock, SCHEDULE.outcome));
  state.arrivals.outcome = state.clock;
  runOutcome(state);
  state.scene = "done";
  return state;
}

/** Names for the people a screen needs to offer for a job, best suited first. */
export function candidatesFor(state: HiringState, kind: TaskKind): { id: string; fit: number; free: boolean }[] {
  return ROSTER.filter((employee) => employee.id in state.assign)
    .map((employee) => ({
      id: employee.id,
      fit: taskFit(employee.id, kind).fit,
      free: isFree(state, employee.id),
    }))
    .sort((a, b) => b.fit - a.fit);
}

export { capacityOf, nameOf };
