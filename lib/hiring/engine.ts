import { formFor, handoverFloor } from "./forms";
import {
  END_AT,
  PEAK_AT,
  SCHEDULE,
  advanceTo,
  aisleBlocked,
  capacityOf,
  coverageOf,
  flexibleReserve,
  isFree,
  metricsOf,
  outputOf,
  projectedPeak,
  roleFit,
  staffAt,
  suitedAndFree,
  taskFit,
  weakestStation,
} from "./model";
import { BY_ID, ROSTER, STATION_LABEL, STATION_PLACE, nameOf } from "./roster";
import {
  STATIONS,
  type Action,
  type FinalTask,
  type FormId,
  type HiringState,
  type Intervention,
  type Owner,
  type SceneId,
  type Stamped,
  type Station,
  type TaskKind,
} from "./types";

/**
 * The shift.
 *
 * A pure function from what the candidate did to what the store became. There
 * is one store, and every decision changes it: the floor built in the first
 * four minutes is the floor that meets the surge at 17:39, the person sent to
 * recount the cage is not picking while they do it, and the associate who was
 * threatened at 17:34 moves to the packing bench at 17:48 at three-quarters
 * speed.
 *
 * Nothing in here knows what a good answer is. That is the scorer's job, and
 * it only ever reads what this file recorded.
 */

/** Riya's induction keeps her on picking this week; the board will not move her. */
export const FIXED_ON_FLOOR = new Set(["riya"]);

export function initialState(form: FormId): HiringState {
  return {
    form,
    scene: "handover",
    clock: 0,
    expiry: null,
    arrivals: { handover: 0 },
    assign: handoverFloor(form),
    busy: {},
    flow: { pickQ: 3.5, packQ: 0.4, dispQ: 0 },
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
    riya: { inspected: false, choices: null, pairUntil: 0, pairPartner: null },
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
export const NIL_SOURCES = ["overstock", "replenArea", "adjacentBin", "transactions"] as const;
export const BN_PANELS = ["bnPicking", "bnPacking", "bnDispatch", "bnShelf", "bnAisle", "bnQueue"] as const;

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
 * The order on bench P2. It has been waiting on a bag, so it is at the edge of
 * target on the calmest evening and well past it on a bad one; and repacking
 * takes longer where the bench is already stretched.
 */
export function bagClock(state: HiringState): { now: number; penalty: number } {
  return {
    now: Math.max(metricsOf(state).ctd, 172) + 6,
    penalty: coverageOf(state, "packing") < 0.95 ? 17 : 12,
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
      STATIONS.map((station) => [station, coverageOf(state, station)]),
    ) as Record<Station, number>;
    state.bn.constraintAtStart = weakestStation(state);
    state.bn.blamed = state.bn.constraintAtStart === "picking" ? "packing" : "picking";
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
 * Work that belongs to a station. Somebody already standing there does it as
 * part of the job; anybody else has to leave their own station to do it.
 */
const OWN_WORK: Partial<Record<Station, TaskKind[]>> = {
  replenishment: ["search", "replenish", "inbound", "aisle"],
  dispatch: ["riders", "lateOrder"],
  packing: ["repack"],
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

/** Somebody was moved to stand somewhere else. */
function move(state: HiringState, emp: string, to: Station, asDelegation: string | null): void {
  if (!(emp in state.assign) || FIXED_ON_FLOOR.has(emp)) return;
  const constraint = formFor(state.form).constraint;
  state.assign[emp] = to;
  if (to === constraint || to === state.bn.constraintAtStart) {
    state.constraintActs.push({ at: state.clock, ctd: metricsOf(state).ctd, where: state.scene });
  }
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
      detail: `${STATION_LABEL[constraint]} is at ${Math.round(now.coverage[constraint] * 100)}% of what the peak needs.`,
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
      title: `${form.highValue.item} variance`,
      detail:
        state.kase.stage === "deferred"
          ? "Still uncounted. System and shelf have not been reconciled."
          : controlled
            ? "One unit unresolved. Cage access is controlled; the evidence pack is not finished."
            : "One unit unresolved, and the cage is still open to normal access.",
      urgent: !controlled,
      managerLevel: true,
      kind: "followUp",
    });
  }

  const removed = state.assign.riya !== "picking";
  tasks.push({
    id: "riyaCoaching",
    title: removed ? "Riya — conversation about being moved" : "Riya — Zone C coaching",
    detail: removed
      ? "She was taken off picking mid-induction and has asked why."
      : "Lookalike SKUs in Zone C. Twenty minutes with an expert would fix most of it.",
    urgent: false,
    managerLevel: false,
    kind: "coaching",
  });

  tasks.push({
    id: "audit",
    title: "Full inventory audit",
    detail: "Cluster office wants a wall-to-wall count this week.",
    urgent: false,
    managerLevel: false,
    kind: "audit",
  });

  const shelf = now.coverage.replenishment;
  tasks.push({
    id: "inbound",
    title: "Inbound cartons",
    detail:
      shelf < 0.85
        ? "Grocery inward is still on the floor and fast lines are running low on the shelf."
        : "Grocery inward is still on the floor. Shelves are holding for now.",
    urgent: shelf < 0.85,
    managerLevel: false,
    kind: "inbound",
  });

  tasks.push({
    id: "riders",
    title: "Rider gap",
    detail: "Two riders are late back from the last wave. Handover order needs resequencing.",
    urgent: true,
    managerLevel: false,
    kind: "riders",
  });

  if (state.nil.outcome && state.nil.outcome !== "replenished") {
    tasks.push({
      id: "nilRecon",
      title: "Nil-pick reconciliation",
      detail: `${form.nilPick.item}: system and shelf still disagree.`,
      urgent: false,
      managerLevel: false,
      kind: "search",
    });
  }

  const late = Math.max(2, Math.round((state.maxCtd - 150) / 12));
  tasks.push({
    id: "lateOrder",
    title: "Order #5521 will miss its promise",
    detail: `About ${late} minutes late. The customer has not been told.`,
    urgent: true,
    managerLevel: false,
    kind: "lateOrder",
  });

  if (aisleBlocked(state)) {
    tasks.push({
      id: "aisle",
      title: "Aisle C still blocked",
      detail: "Pickers are walking round it. Every route through C is a third longer.",
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
        if (action.emp in state.assign && !FIXED_ON_FLOOR.has(action.emp)) {
          state.assign[action.emp] = action.to;
        }
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
      if (action.choices.includes("onDemand")) {
        state.tempArrivesAt = 1500; // 17:50
        state.cost += 640;
      }
      const projected = projectedPeak(state, action.choices.includes("extend"));
      state.absence = {
        choices: action.choices,
        projectedMin: Math.min(projected.picking, projected.packing, projected.dispatch, projected.replenishment),
        pickingProjected: projected.picking,
        at: state.clock,
      };
      // The floor is re-read here: this is the team that goes into the evening.
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

      if (choices.includes("pair")) {
        const partner = staffAt(state, "picking")
          .filter((id) => id !== "riya" && id !== "temp")
          .sort((a, b) => (BY_ID[b]?.skills.picking ?? 0) - (BY_ID[a]?.skills.picking ?? 0))[0];
        state.riya.pairPartner = partner ?? null;
        state.riya.pairUntil = state.clock + 600;
      }
      if (choices.includes("removePicking")) {
        state.assign.riya = "replenishment";
        state.trust -= 6;
      } else if (choices.includes("moveToPacking")) {
        state.assign.riya = "packing";
      }
      if (choices.includes("warn")) state.trust -= 8;
      if (choices.includes("coachLater") || choices.includes("moveAB") || choices.includes("pair")) {
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
      // On the floor, the rest of picking hears every word of it.
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
        packingQueue: now.packingQueue,
        ctd: now.ctd,
      };
      if (action.choice === "handOver" && action.owner && !state.kase.recordsOwner) {
        state.kase.recordsOwner = action.owner;
        state.kase.recordsDoneAt = delegate(state, "records", "Pull the records", action.owner, "records");
        spend(state, 20);
      }
      if (action.choice === "stepOut" && action.move) {
        move(state, action.move, form.constraint, null);
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
        // With nobody covering the floor, there is nobody free to look.
        const thin = coverageOf(state, "replenishment") < 0.8 ? 2 : 1;
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
          personal(state, "replenish", "Restocked the shelf personally", "replenish");
          spend(state, 120);
        } else {
          delegate(state, "replenish", `Restock the ${form.nilPick.item}`, action.owner, "replenish");
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
        move(state, constraint.owner, form.constraint, "constraintSupport");
      }
      if (aisle.mode === "delegate" && aisle.owner) clearAisle(state, aisle.owner);
      if (followUp.mode === "delegate" && followUp.owner) {
        delegate(state, "followUp", "Evidence pack for the variance", followUp.owner, "followUp");
        state.followUp = "delegated";
      }
      spend(state, 30);

      if (constraint.mode === "handle") {
        const benchKind =
          form.constraint === "replenishment" ? "inbound" : form.constraint === "dispatch" ? "riders" : "repack";
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
        delegate(state, "repack", "Repack the bag at P2", action.by, "repack");
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
    case "addSlot":
      if (step.station === "picking" || state.shocks.lanes.includes(step.station)) break;
      state.shocks.lanes.push(step.station);
      if (step.station === formFor(state.form).constraint || step.station === state.bn.constraintAtStart) {
        state.constraintActs.push({ at: state.clock, ctd: metricsOf(state).ctd, where: state.scene });
      }
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
        if (entry.bucket === "delegate" && owner) move(state, owner, form.constraint, "plan:constraint");
        break;
      case "variance":
        if (entry.bucket === "now") state.followUp = "done";
        if (entry.bucket === "delegate") state.followUp = "delegated";
        break;
      case "riyaCoaching":
        // Coaching in the peak takes the learner off the floor as well.
        if (entry.bucket !== "later" && state.assign.riya) {
          state.busy.riya = { until: state.clock + 420, task: "coaching" };
        }
        break;
      case "inbound":
        if (entry.bucket !== "later") state.shocks.inboundCleared = true;
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
    const critical = Math.min(now.coverage.picking, now.coverage.packing, now.coverage.dispatch);
    coverages.push(Math.min(1, critical));

    if (mark === marks[0]) {
      pickingAtPeak = now.coverage.picking;
      const cover = now.coverage[form.constraint];
      events.push(
        cover >= 0.97
          ? { clock: mark, text: `${form.surgeHeadline} stabilises.`, tone: "good" }
          : cover >= 0.85
            ? { clock: mark, text: `${form.surgeHeadline} is holding, just.`, tone: "warn" }
            : { clock: mark, text: `${form.surgeHeadline} is still growing.`, tone: "bad" },
      );
    }

    if (mark === marks[1]) {
      riyaOutput = state.assign.riya === "picking" && isFree(state, "riya") ? outputOf(state, "riya", "picking") : 0;
      if (state.assign.riya !== "picking") {
        events.push({ clock: mark, text: "Picking is a person short. Riya is not on it.", tone: "warn" });
      } else if (riyaOutput >= 0.84) {
        events.push({ clock: mark, text: "Riya maintains improved throughput.", tone: "good" });
      } else {
        events.push({ clock: mark, text: "Riya is still slow through Zone C.", tone: "warn" });
      }
      if (state.arjun.outcome === "leaving") {
        events.push({ clock: mark, text: "Arjun clocked out at 18:00. Picking feels it.", tone: "warn" });
      } else if (state.arjun.outcome === "resentful") {
        events.push({ clock: mark, text: "Arjun is on the floor and doing exactly what was asked, no more.", tone: "warn" });
      }
    }

    if (mark === marks[2]) {
      const steps = state.kase.disposition?.steps ?? [];
      if (state.kase.stage === "deferred") {
        events.push({ clock: mark, text: `${form.highValue.item} variance is still uncounted.`, tone: "bad" });
      } else if (steps.includes("writeOff") || steps.includes("accuse")) {
        events.push({ clock: mark, text: `${form.highValue.item} discrepancy was closed without being explained.`, tone: "bad" });
      } else if (steps.includes("controlAccess") && state.followUp !== "open") {
        events.push({ clock: mark, text: `${form.highValue.item} discrepancy remains controlled and escalated.`, tone: "good" });
      } else {
        events.push({ clock: mark, text: `${form.highValue.item} discrepancy is open, and so is the cage.`, tone: "warn" });
      }
    }

    if (mark === END_AT) {
      events.push(
        now.ctd <= 180
          ? { clock: mark, text: "CTD returns below target.", tone: "good" }
          : now.ctd <= 200
            ? { clock: mark, text: `CTD is at ${now.ctd} seconds and falling.`, tone: "warn" }
            : { clock: mark, text: `CTD is at ${now.ctd} seconds. The app has extended the promise.`, tone: "bad" },
      );
    }
  }

  const finalCtd = metricsOf(state).ctd;
  const peakMax = Math.max(...state.trace.filter((point) => point.t >= PEAK_AT).map((point) => point.ctd), finalCtd);
  const title =
    finalCtd <= 180 && peakMax <= 205
      ? "PEAK UNDER CONTROL"
      : finalCtd <= 205
        ? "STORE STABILISED"
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
  "team", "metrics", "pending", "demand",
  "riyaNumbers", "incentiveStatus", "eligibility", "bnEffect",
  ...CASE_TOOLS, ...NIL_SOURCES, ...BN_PANELS,
]);
const RIYA_CHOICES = new Set(["moveAB", "pair", "coachLater", "keep", "removePicking", "moveToPacking", "warn"]);
const ABSENCE_CHOICES = new Set(["onDemand", "reallocate", "extend", "short"]);
const UNIT_CALLS = new Set(["explained", "recovered", "unresolved", "writeoff", "theft"]);
const CASE_STEPS = new Set(["preserve", "controlAccess", "escalate", "accuse", "writeOff", "closeStore"]);
const CONTROL_FIXES = new Set(["scanAtIssue", "exceptionRestow", "remindTeam", "fullAudit"]);
const MODES = new Set(["handle", "delegate", "later"]);
const BUCKETS = new Set(["now", "delegate", "later"]);
const REPLIES = new Set([...STATIONS, "aisle", "unsure", "holding"]);

const isStation = (value: unknown): value is Station => STATIONS.includes(value as Station);
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
            : step.kind === "addSlot" ? isStation(step.station)
              : step.kind === "clearAisle" ? owner(step.owner)
                : step.kind === "slowRelease")
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
 * undecided, and the store runs on to 18:20 with the team as it is.
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
