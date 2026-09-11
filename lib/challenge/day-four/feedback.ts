import { isCorrectBottleneck } from "./engine";
import { metricsOf, routeSeconds } from "./floor";
import { BATCHES, RECOVERY_AT, ZONE_IN_SENTENCE, clockAt } from "./scenario";
import {
  DAY_FOUR_BAND_RANGE,
  assessDay4,
  operatorCompetencies,
  type Day4Assessment,
} from "./scoring";
import { createDay4 } from "./engine";
import { DAY_FOUR_DIMENSIONS, type Day4Dimension, type Day4State } from "./types";
import type { ChallengeResult, FeedbackItem, FlowSummary } from "../types";

/**
 * Day 4 feedback. Every line names something the operator actually did, with
 * the floor's own numbers behind it.
 */

const pct = (value: number) => `${Math.round(value * 100)}%`;

interface Entry {
  t: number;
  tone: "good" | "warn";
  text: string;
  weight: number;
}

function buildTimeline(state: Day4State, a: Day4Assessment): FlowSummary["timeline"] {
  const entries: Entry[] = [];
  const push = (t: number | null | undefined, tone: "good" | "warn", text: string, weight: number) => {
    if (t !== null && t !== undefined) entries.push({ t, tone, text, weight });
  };
  const m = state.milestones;

  if (state.bottleneck) {
    const correct = isCorrectBottleneck(state.bottleneck);
    push(
      m.mark?.sim,
      correct ? "good" : "warn",
      correct
        ? `Marked ${ZONE_IN_SENTENCE[state.bottleneck]} as the constraint`
        : `Marked ${ZONE_IN_SENTENCE[state.bottleneck]} as the bottleneck — the constraint was stock leaving staging`,
      4,
    );
  }

  if (m.dock) {
    if (state.plan.grocery === "now") {
      push(m.dock.sim, "warn", "Sent the grocery vehicle straight onto a 94%-full staging area", 4);
    } else if (state.plan.grocery === "hold") {
      push(m.dock.sim, "good", "Held the 96-carton grocery load while staging was saturated", 3);
    } else {
      push(m.dock.sim, "good", "Queued the grocery vehicle behind the cold loads", 2);
    }
  }

  const qc = state.qcIssue;
  if (qc.resolvedAt !== null) {
    const text =
      qc.status === "quarantine"
        ? "Quarantined crate D1-07 at the QC gate"
        : qc.status === "recheck"
          ? "Held crate D1-07 for recheck — it failed and was quarantined"
          : qc.status === "accept"
            ? "Accepted a short-life, damaged dairy crate into stock"
            : "Sent crate D1-07 straight to the shelf past QC and GRN";
    push(qc.resolvedAt, qc.status === "quarantine" || qc.status === "recheck" ? "good" : "warn", text, 4);
  }

  if (state.aisle.clearedAt !== null && state.aisle.clearedAt <= RECOVERY_AT) {
    push(
      state.aisle.clearedAt,
      state.aisle.clearedAt <= 18 ? "good" : "warn",
      state.aisle.clearedAt <= 18 ? "Cleared Aisle C and gave pickers their route back" : "Cleared Aisle C late in the morning",
      3,
    );
  } else if (state.aisle.action === "leave" && state.aisle.actedAt !== null) {
    push(state.aisle.actedAt, "warn", "Left the cartons in Aisle C", 3);
  }

  if (a.stats.groceryIntoCongestion >= 6) {
    const first = state.history.find((snap) => snap.groceryUnloading && snap.congestion > 1);
    push(first?.t, "warn", `Kept unloading grocery into a floor over capacity for ${a.stats.groceryIntoCongestion} minutes`, 5);
  } else if (state.groceryPausedAt !== null) {
    push(state.groceryPausedAt, "good", "Paused the grocery unload before the floor choked", 3);
  }

  const dairyReady = state.batches.D1.readyAt;
  if (dairyReady !== null) {
    push(dairyReady, dairyReady <= 36 ? "good" : "warn", `Milk and curd pick-ready at ${clockAt(dairyReady)}`, 2);
  }
  const g1Ready = state.batches.G1.readyAt;
  if (g1Ready !== null) {
    push(g1Ready, g1Ready <= 40 ? "good" : "warn", `Cold drinks on the fast-pick shelves at ${clockAt(g1Ready)}`, 2);
  }

  if (m.lock) {
    const r = a.stats.recoveryScore;
    push(
      RECOVERY_AT,
      r >= 80 ? "good" : "warn",
      r >= 80
        ? "Locked a recovery sequence that cleared the route before the stock"
        : state.recovery.flat().length === 0
          ? "Went into the last twelve minutes without a recovery sequence"
          : r >= 55
            ? "Locked a workable recovery sequence with gaps in it"
            : "Locked a recovery sequence that left the bottleneck in place",
      3,
    );
  }

  while (entries.length > 7) {
    const pool = entries.filter((entry) => entry.tone === "good");
    const from = pool.length > 0 ? pool : entries;
    const drop = from.reduce((low, entry) => (entry.weight < low.weight ? entry : low));
    entries.splice(entries.indexOf(drop), 1);
  }
  return entries
    .sort((x, y) => x.t - y.t)
    .map((entry) => ({ time: clockAt(entry.t), tone: entry.tone, text: entry.text }));
}

function bestCall(state: Day4State, a: Day4Assessment): FeedbackItem | null {
  const candidates: { gain: number; item: FeedbackItem }[] = [];

  if (a.stats.heldCartons >= 15 && a.stats.groceryIntoCongestion < 6) {
    candidates.push({
      gain: a.stats.heldCartons,
      item: {
        title: "Controlled the inflow",
        body: `Holding the grocery unload kept about ${a.stats.heldCartons} more cartons off a floor that was already saturated — and freed the unloading team to put stock away instead.`,
      },
    });
  }

  const cleared = state.aisle.clearedAt;
  if (cleared !== null && cleared <= RECOVERY_AT) {
    const before = state.history.find((snap) => snap.t <= cleared);
    const after = state.history.find((snap) => snap.t > cleared + 1);
    const saved = before && after ? Math.max(0, Math.round(before.delay - after.delay)) : 0;
    if (saved >= 5) {
      candidates.push({
        gain: saved * 2,
        item: {
          title: "Gave the pickers their route back",
          body: `Clearing Aisle C at ${clockAt(cleared)} took about ${saved} seconds off every picker trip through it — ${routeSeconds(before?.delay ?? 23)} down to ${routeSeconds(after?.delay ?? 2)}.`,
        },
      });
    }
  }

  const dairyReady = state.batches.D1.readyAt;
  if (dairyReady !== null && dairyReady <= 38) {
    candidates.push({
      gain: 42 - dairyReady,
      item: {
        title: "Put lunch on the shelf first",
        body: `Milk and curd were pick-ready at ${clockAt(dairyReady)}, ${42 - dairyReady} minutes before lunch demand arrived.`,
      },
    });
  }

  if (state.qcIssue.status === "quarantine" || state.qcIssue.status === "recheck") {
    candidates.push({
      gain: 8,
      item: {
        title: "Held the QC line under pressure",
        body: "Quarantining crate D1-07 cost a minute at the gate and kept a two-day-life, damaged crate out of a customer's lunch order.",
      },
    });
  }

  const top = candidates.reduce<{ gain: number; item: FeedbackItem } | null>(
    (best, candidate) => (!best || candidate.gain > best.gain ? candidate : best),
    null,
  );
  return top?.item ?? null;
}

const ORDER: Day4Dimension[] = [...DAY_FOUR_DIMENSIONS];

function developmentArea(state: Day4State, a: Day4Assessment): { area: string; body: string } {
  const lowest = ORDER.reduce((low, dimension) => (a.dims[dimension] < a.dims[low] ? dimension : low));
  switch (lowest) {
    case "bottleneckDiagnosis":
      if (!isCorrectBottleneck(state.bottleneck)) {
        return {
          area: "Bottleneck diagnosis",
          body: `You marked ${state.bottleneck ? ZONE_IN_SENTENCE[state.bottleneck] : "nothing"} as the bottleneck. The constraint was the rate stock left staging — putaway was clearing 22 cartons in ten minutes while inbound was arriving faster.`,
        };
      }
      return {
        area: "Downstream capacity",
        body: "You named the right constraint, then kept feeding it. You increased inbound activity while putaway was still saturated — more activity is not the same as more throughput.",
      };
    case "processSequencing":
      return state.plan.grocery === "now"
        ? {
            area: "Downstream capacity",
            body: "You increased inbound activity while putaway was still constrained. Every team on a dock is a team not clearing the floor — more activity is not the same as more throughput.",
          }
        : {
            area: "Process sequencing",
            body: "The recovery sequence asked for work the floor couldn't do yet — putaway of stock that hadn't been scanned, or clearing that came after the stock it was meant to make room for.",
          };
    case "timePriority":
      return {
        area: "Priority inventory",
        body: `High-demand stock was ${pct(a.stats.finalReadiness)} pick-ready when lunch arrived. ${
          a.tags.includes("slow_moving_inventory_prioritised")
            ? "Mixed and slow-moving grocery went onto shelves ahead of milk and cold drinks."
            : "The route cleared, but the stock lunch leans on was still in staging."
        }`,
      };
    case "flowSpace":
      if (a.stats.congestionMinutes >= 6) {
        return {
          area: "Floor congestion",
          body: `The floor spent ${a.stats.congestionMinutes} minutes over capacity or with Aisle C half-blocked. Pickers walked around cartons for much of the morning.`,
        };
      }
      if (a.stats.finalCongestion >= 0.5) {
        return {
          area: "Clearing the floor",
          body: `The floor ended the morning at ${pct(a.stats.finalCongestion)} — about ${Math.round(a.stats.finalCongestion * 84)} inbound cartons were still waiting when lunch began.`,
        };
      }
      if (state.batches.G1.onTruck > 0) {
        return {
          area: "Inbound productivity",
          body: "The floor stayed clear because almost nothing came in. The cold drinks lunch needs never came off the grocery vehicle.",
        };
      }
      return {
        area: "Picker routes",
        body: `Aisle C still added ${Math.round(a.stats.finalDelay)} seconds to a pick when lunch began.`,
      };
    case "sopQuality":
      if (state.bypassed > 0 || state.qcIssue.status === "accept") {
        return {
          area: "Quality control",
          body: "A short-life, damaged crate went into stock to save a minute at the gate. Fast flow cannot override quality control.",
        };
      }
      return {
        area: "Cold chain",
        body: `Cold stock sat on the ambient floor too long — dairy for ${Math.round(state.batches.D1.exposure)} minutes, frozen for ${Math.round(state.batches.F1.exposure)}. It needed its storage before the floor needed clearing.`,
      };
    case "commercial":
      return {
        area: "Commercial readiness",
        body: `Lunch will run at about ${a.stats.lunchCtd} seconds click-to-dispatch. ${
          state.batches.G1.destination === "fastpick"
            ? "What slowed it was stock that lunch needed still waiting in staging."
            : "Cold drinks never reached the fast-pick shelves they sell from."
        }`,
      };
  }
}

function recommendations(state: Day4State, a: Day4Assessment): string[] {
  const pool: string[] = [];
  const add = (when: boolean, line: string) => {
    if (when && !pool.includes(line)) pool.push(line);
  };
  add(
    a.tags.includes("bottleneck_misdiagnosed"),
    "Look downstream before you act: the constraint was the rate stock left staging, not the vehicles waiting to arrive.",
  );
  add(
    a.tags.includes("grocery_unloaded_into_congestion") || state.plan.grocery === "now",
    "Hold the vehicle when staging is saturated. A team moved from the dock to putaway drains the floor instead of filling it.",
  );
  add(
    a.tags.includes("quality_issue_accepted") || a.tags.includes("verification_bypassed"),
    "Quarantine the crate and keep moving. A minute at the QC gate is cheaper than a short-life crate in a lunch order.",
  );
  add(
    a.tags.includes("aisle_c_left_blocked") || (state.aisle.clearedAt ?? 99) > 18,
    "Clear the picker route first. Aisle C costs every order that passes through it; the cartons in it cost nothing extra where they wait.",
  );
  add(
    a.tags.includes("slow_moving_inventory_prioritised") || a.stats.finalReadiness < 0.8,
    "Make milk, curd and cold drinks pick-ready before anything slow-moving. Lunch is sold from the shelf, not from staging.",
  );
  add(
    a.tags.includes("cold_chain_bypassed"),
    "Put cold stock away the moment it is scanned. Every minute on the ambient floor is a minute out of the cold chain.",
  );
  add(
    a.tags.includes("unsafe_aisle_storage_used"),
    "Never clear staging into a picking aisle. It moves the congestion onto the pickers instead of removing it.",
  );
  add(
    a.tags.includes("all_inbound_stopped_unnecessarily"),
    "Control inflow rather than stopping it: pause the grocery, keep the cold loads moving into their storage.",
  );
  add(
    a.tags.includes("recovery_sequence_reactive"),
    "Sequence recovery around the constraint: clear the route, finish scanning, then store the stock lunch needs.",
  );
  for (const line of [
    "Unload only what the floor can absorb — the beverages, then pause — and let putaway set the pace of receiving.",
    "Open a safe staging lane early; it keeps overflow off the dock apron and out of the aisles.",
    "Scan cold loads first so they reach their storage inside their exposure limits.",
  ]) {
    add(true, line);
  }
  return pool.slice(0, 3);
}

const LEARNED: FeedbackItem[] = [
  {
    title: "More activity is not more throughput",
    body: "Unloading faster than stock leaves staging only moves the queue onto the floor — into the aisles, onto the dock apron, into the pickers' way.",
  },
  {
    title: "Every system has one constraint",
    body: "This morning it was putaway: the rate at which stock left staging. Speeding up anything upstream of it made the store slower, not faster.",
  },
  {
    title: "Quality and cold chain are not trade-offs",
    body: "A crate that fails its check does not become acceptable because the floor is busy, and cold stock does not wait on the ambient floor while you clear space.",
  },
];

export function buildDay4Result(state: Day4State): ChallengeResult {
  const a = assessDay4(state);
  const best = bestCall(state, a);
  const area = developmentArea(state, a);
  const opening = metricsOf(createDay4());
  const final = metricsOf(state);
  const qcFlags = (state.qcIssue.status === "accept" ? 1 : 0) + state.bypassed;
  const cleared = final.congestion <= 0.4 && final.delay <= 6 && final.readiness >= 0.8;

  const flow: FlowSummary = {
    outcome: {
      title: cleared ? "FLOOR CLEARED" : final.congestion < 0.8 ? "FLOOR STABILISED" : "FLOOR UNDER PRESSURE",
      peakReady: cleared,
      congestion: { from: Math.round(opening.congestion * 100), to: Math.round(final.congestion * 100) },
      routeDelay: { from: Math.round(opening.delay), to: Math.round(final.delay) },
      pickReady: { from: Math.round(opening.pickReadyInbound * 100), to: Math.round(final.pickReadyInbound * 100) },
      ctd: { from: opening.ctd, to: a.stats.lunchCtd },
      priorityReadiness: Math.round(final.readiness * 100),
      qcFlags,
      quarantined: state.quarantine,
    },
    metrics: {
      flowEfficiency: Math.round(a.stats.flowEfficiency * 100),
      bottleneckAccuracy: a.bottleneckAccuracy,
      congestionMinutes: a.stats.congestionMinutes,
      congestionShare: Math.round((a.stats.congestionMinutes / a.stats.minutes) * 100),
      priorityReadiness: Math.round(final.readiness * 100),
      sopIntegrity: a.dims.sopQuality,
    },
    timeline: buildTimeline(state, a),
    bestCall: best,
    developmentArea: area,
    operatorCompetencies: operatorCompetencies(a),
    lockedByClock: state.lockedBy === "clock",
  };

  return {
    day: 4,
    score: a.score,
    band: a.band,
    bandRange: DAY_FOUR_BAND_RANGE[a.band],
    competencies: a.competencies,
    signature: a.style,
    strengths: best ? [best] : [],
    gaps: [{ title: area.area, body: area.body }],
    replay: recommendations(state, a),
    learned: LEARNED,
    sopViolations: [],
    decisionCount: Object.keys(state.milestones).length + state.inspected.length,
    flow,
    durationMs: state.completedAt ? state.completedAt - state.startedAt : (state.milestones.lock?.at ?? 0),
  };
}

export { assessDay4, BATCHES };
