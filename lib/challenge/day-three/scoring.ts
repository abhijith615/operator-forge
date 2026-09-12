import {
  ACTUAL,
  PLANNED,
  bestStation,
  coverageAt,
  coverageOver,
  deficitOf,
  evaluate,
  minStation,
  peakStats,
  placeAt,
  relativeSkill,
  riderHeadcount,
  simulateFlow,
  type PeakStats,
} from "./capacity";
import { flexCost, paidBookings, reached, riderCost, ridersSourced, withoutFlexBooking } from "./engine";
import { EVENING_END, PEAK_FROM, PEAK_TO, riderNeedAt } from "./forecast";
import {
  accurateStatus,
  arjunCommunication,
  peopleBalance,
  riyaHas,
  riyaJudgement,
  riyaTrust,
  statedStatus,
  type PeopleBalance,
} from "./people";
import { AUDIT, FLEX, FLEX_BUDGET, REGULARS, RIYA, flexWindow } from "./workforce";
import {
  DAY_THREE_DIMENSIONS,
  DAY_THREE_DIMENSION_BLURB,
  DAY_THREE_DIMENSION_LABEL,
  type ArjunOutcome,
  type Day3Dimension,
  type Day3State,
  type Day3Tag,
  type FaisalAction,
  type Phase,
  type Station,
  type Worker,
} from "./types";
import type { CompetencyScore } from "../types";

/**
 * Day 3 assessment.
 *
 * Day 3 is scored from what the plan actually does, not from a tally of
 * choices. There is no correct roster: a plan that rebalances the core team
 * and a plan that books flex into the gap can both score in the nineties,
 * because both put the right capacity in the right place at the right time.
 * Every number that shapes a score lives in this file.
 */

export const DAY_THREE_WEIGHTS: Record<Day3Dimension, number> = {
  workforcePlanning: 0.22,
  skillMatching: 0.17,
  adaptability: 0.17,
  peopleJudgement: 0.14,
  communicationTrust: 0.1,
  prioritisation: 0.1,
  resourceDiscipline: 0.1,
};

export type Day3Band =
  | "Needs Foundation"
  | "Developing Manager"
  | "Capable Shift Planner"
  | "Strong Workforce Leader"
  | "Exceptional Day 3 Performance";

export function day3Band(score: number): Day3Band {
  if (score < 50) return "Needs Foundation";
  if (score < 65) return "Developing Manager";
  if (score < 80) return "Capable Shift Planner";
  if (score < 90) return "Strong Workforce Leader";
  return "Exceptional Day 3 Performance";
}

export const DAY_THREE_BAND_RANGE: Record<Day3Band, string> = {
  "Needs Foundation": "Below 50",
  "Developing Manager": "50–64",
  "Capable Shift Planner": "65–79",
  "Strong Workforce Leader": "80–89",
  "Exceptional Day 3 Performance": "90–100",
};

/** Same rule as the other days: an honest first attempt is not told it scored 12. */
const SOFT_FLOOR = 35;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Linear 0–100 between two anchors; works in either direction. */
function lin(value: number, zero: number, full: number): number {
  return Math.round(clamp01((value - zero) / (full - zero)) * 100);
}

/* ── Faisal ───────────────────────────────────────────────────────────── */

/**
 * A slow worker is not automatically a bad worker. The strongest responses
 * protect the peak and develop the person; removing a 99.7%-accurate picker
 * solves a problem he did not have.
 */
export function faisalScore(actions: FaisalAction[]): number {
  const chosen = new Set(actions);
  if (chosen.has("remove")) return chosen.has("coach") ? 25 : 10;
  if (chosen.has("packing")) return chosen.has("coach") ? 30 : 15;
  const roleAdjusted = chosen.has("zone") || chosen.has("pair");
  if (roleAdjusted && chosen.has("coach")) return 100;
  // Pairing is coaching on the floor, so it stands on its own better than a zone move.
  if (chosen.has("pair")) return 88;
  if (chosen.has("zone")) return 70;
  if (chosen.has("coach")) return chosen.has("keep") ? 55 : 60;
  return 25;
}

/* ── Placements ───────────────────────────────────────────────────────── */

export interface Placement {
  worker: Worker;
  station: Station;
}

/** Everyone's evening role as locked, Faisal's intervention applied. */
export function placements(state: Day3State): Placement[] {
  const result: Placement[] = [];
  for (const worker of REGULARS) {
    let station = state.assignments[worker.id] ?? null;
    if (worker.id === "faisal") {
      if (state.faisal.includes("remove")) station = null;
      else if (state.faisal.includes("packing")) station = "packing";
    }
    if (station) result.push({ worker, station });
  }
  for (const worker of FLEX) {
    const booking = state.flex[worker.id];
    if (!booking) continue;
    let station: Station | null = booking.station;
    if (worker.id === RIYA.id) {
      const actions = state.people.riya.interventions;
      if (actions.includes("remove")) station = null;
      else if (actions.includes("packing")) station = "packing";
    }
    if (station) result.push({ worker, station });
  }
  return result;
}

/**
 * The cheapest sensible way to have sourced the same useful riders: Store
 * 117's spares first, then the local pool. Recalled morning riders are cheaper
 * on paper and are deliberately last — they have already worked a shift.
 */
function cheapestRiderCost(riders: number): number {
  const ladder = [60, 60, 60, 60, 60, 60, 210, 210, 210, 210, 140, 140, 140, 140, 140];
  return ladder.slice(0, riders).reduce((sum, cost) => sum + cost, 0);
}

/* ── Assessment ───────────────────────────────────────────────────────── */

export interface Day3Breach {
  id: string;
  label: string;
  severity: number;
}

export interface Day3Assessment {
  dims: Record<Day3Dimension, number>;
  competencies: CompetencyScore[];
  score: number;
  band: Day3Band;
  breaches: Day3Breach[];
  tags: Day3Tag[];
  style: { name: string; blurb: string };
  peak: PeakStats;
  /** Share of the evening's predictable gap closed during planning, 0–1. */
  anticipation: number;
  skillUtilisation: number;
  flex: {
    cost: number;
    hours: number;
    usefulHours: number;
    matched: number;
    bookings: number;
    inPeakShare: number | null;
  };
  riders: { cost: number; sourced: number; morning: number };
  risks: {
    fatigue: "Low" | "Moderate" | "High";
    untrained: number;
    expertDependency: boolean;
    unnecessaryRemoval: boolean;
  };
  people: {
    arjunOutcome: ArjunOutcome;
    arjunCommunication: number;
    riya: number;
    balance: PeopleBalance;
  };
  parts: {
    forecastWeak: boolean;
    forecastGain: number;
    lateGap: number;
    lateNeeded: boolean;
    lateRatio: number | null;
    receivingComp: number;
    auditComp: number;
    faisal: number;
    worstMismatch: Placement | null;
  };
}

export function assessDay3(state: Day3State): Day3Assessment {
  const series = evaluate(state, ACTUAL);
  const flow = simulateFlow(series);
  const peak = peakStats(series, flow);
  const planned = evaluate(state, PLANNED);
  const actualPeak = peak.peak;

  /* ── Workforce planning ── */
  const service = lin(peak.serviceRate, 0.82, 0.995);
  const g0 = state.core?.deficit ?? deficitOf(planned);
  const g2 = state.planningDeficit ?? g0;
  const gf = state.lockDeficit ?? deficitOf(planned);
  const closedTotal = Math.max(0, g0 - gf);
  const closedEarly = Math.min(closedTotal, Math.max(0, g0 - g2));
  const anticipation = closedTotal > 5 ? closedEarly / closedTotal : gf <= 40 ? 1 : 0;

  // Flow balance reads shortfall against the other stations. Surplus above
  // 110% is a cost question, and resource discipline already asks it.
  let imbalance = 0;
  for (let t = PEAK_FROM; t < PEAK_TO; t += 1) {
    const cover = (["picking", "packing", "dispatch"] as Station[]).map((station) =>
      Math.min(1.1, coverageAt(series, station, t)),
    );
    imbalance += Math.max(...cover) - Math.min(...cover);
  }
  imbalance /= PEAK_TO - PEAK_FROM;
  const balance = lin(imbalance, 0.45, 0.08);
  const workforcePlanning = Math.round(0.45 * service + 0.3 * anticipation * 100 + 0.25 * balance);

  /* ── Skill-to-role matching ── */
  const placed = placements(state);
  let utilNum = 0;
  let utilDen = 0;
  let worstMismatch: Placement | null = null;
  let worstValue = 1;
  for (const placement of placed) {
    const { worker, station } = placement;
    const best = bestStation(worker);
    const relBest = relativeSkill(worker, best);
    const relHere = relativeSkill(worker, station);
    let value = relHere / relBest;
    // A cross-trained move to where capacity was scarcer is flexibility, not waste.
    if (
      station !== best &&
      worker.skills[station] >= 2 &&
      relHere >= 0.8 * relBest &&
      actualPeak[station] <= actualPeak[best] + 0.02
    ) {
      value = 1;
    }
    utilNum += value * relBest;
    utilDen += relBest;
    if (relBest >= 1 && value < worstValue - 0.001) {
      worstValue = value;
      worstMismatch = placement;
    }
  }
  const skillUtilisation = utilDen > 0 ? utilNum / utilDen : 0;
  const untrained = placed.filter((placement) => placement.worker.skills[placement.station] === 0).length;
  const untrainedRegular = placed.filter(
    (placement) =>
      placement.worker.kind === "regular" &&
      placement.worker.id !== "faisal" &&
      placement.worker.skills[placement.station] === 0,
  ).length;

  let flexMinutes = 0;
  let flexUseful = 0;
  let flexInPeak = 0;
  let matched = 0;
  // Riya's afternoon is already paid for and already worked; only hours the
  // operator chose to buy tonight are judged as flex spend.
  const paid = paidBookings(state);
  const bookings = paid.length;
  for (const worker of FLEX) {
    const booking = state.flex[worker.id];
    const window = booking ? flexWindow(worker, booking.windowId) : undefined;
    if (!booking || !window || !paid.includes(worker.id)) continue;
    const without = withoutFlexBooking(state, worker.id);
    const bare = evaluate(without, ACTUAL);
    const from = Math.max(window.start, worker.prepaidUntil ?? 0);
    for (let t = from; t < Math.min(window.end, EVENING_END); t += 1) {
      flexMinutes += 1;
      // Extending someone you then pull off the station buys nothing.
      const off = worker.id === RIYA.id && placeAt(state, ACTUAL, worker, t) !== booking.station;
      if (!off && coverageAt(bare, booking.station, t) < 1.05) flexUseful += 1;
      if (t >= PEAK_FROM && t < PEAK_TO) flexInPeak += 1;
    }
    const plannedBare = coverageOver(evaluate(without, PLANNED), from, window.end);
    if (worker.skills[booking.station] >= 2 && plannedBare[booking.station] < 1) matched += 1;
  }
  const flexMatch = bookings > 0 ? matched / bookings : null;
  const skillMatching = Math.round(
    0.6 * lin(skillUtilisation, 0.72, 0.97) +
      0.25 * Math.max(0, 100 - 30 * untrained) +
      0.15 * (flexMatch === null ? 70 : flexMatch * 100),
  );

  /* ── Adaptability ── */
  const coreMin = state.core ? minStation(state.core.covRevised) : 0;
  const forecastWeak = coreMin < 0.92;
  const forecastGain = (state.afterForecast ? minStation(state.afterForecast) : coreMin) - coreMin;
  let forecast: number;
  if (!state.forecastResponse) forecast = 40;
  else if (state.forecastResponse === "adjusted") forecast = forecastGain >= 0.04 ? 100 : forecastWeak ? 55 : 80;
  else if (!forecastWeak) forecast = 85;
  // Kept the floor but closed the gap with flex a minute later: late, not ignored.
  else forecast = state.planningCoverage && minStation(state.planningCoverage) >= 0.95 ? 70 : 20;

  // A late arrival only needs repairing if it actually leaves the station short.
  const late = state.late;
  let lateComp = 90;
  let lateGap = 0;
  let lateNeeded = false;
  let lateRatio: number | null = null;
  if (late?.station) {
    const shortfall = Math.min(1, late.before) - late.atAlert;
    lateGap = Math.max(0, shortfall);
    lateNeeded = late.atAlert < 0.95 && shortfall >= 0.04;
    if (lateNeeded) {
      lateRatio = clamp01(((late.after ?? late.atAlert) - late.atAlert) / shortfall);
      lateComp = 20 + 80 * lateRatio;
      if (state.managerCovered) lateComp = Math.min(lateComp, 70);
      if (!state.milestones.late) lateComp = Math.min(lateComp, 40);
    }
  }

  const receiving = state.receiving;
  let receivingComp: number;
  if (!receiving || receiving.skipped) receivingComp = 10;
  else if (!receiving.authorised) receivingComp = 25;
  else if (receiving.defaulted) receivingComp = 40;
  else {
    const hole = receiving.before - receiving.unfilled;
    receivingComp =
      hole < 0.04 || receiving.after >= Math.min(0.97, receiving.before - 0.02)
        ? 100
        : Math.round(55 + 45 * clamp01((receiving.after - receiving.unfilled) / hole));
  }
  const adaptability = Math.round(0.35 * forecast + 0.35 * lateComp + 0.3 * receivingComp);

  /* ── People judgement ── */
  const faisal = faisalScore(state.faisal);
  const riya = riyaJudgement(state.people.riya);
  const morning = state.riders.morning;
  const fatigueComp = [100, 95, 85, 55, 35, 20][morning] ?? 20;
  // The plan leaned on Arjun: he left for the vehicle and picking fell with him.
  const expertDependency =
    receiving?.workerId === "arjun" &&
    !receiving.backfillId &&
    receiving.before - receiving.after >= 0.1;
  const peopleJudgement = Math.round(
    0.34 * faisal +
      0.3 * riya +
      0.18 * fatigueComp +
      0.18 * Math.max(0, 100 - 30 * untrainedRegular - (expertDependency ? 25 : 0)),
  );

  /* ── Communication and trust ── */
  const arjunComm = arjunCommunication(state.people.arjun);
  const communicationTrust = Math.round(0.7 * arjunComm + 0.3 * riyaTrust(state.people.riya));
  const peopleInsight = peopleBalance(state.people);

  /* ── Prioritisation ── */
  const auditEnd = state.auditStart + AUDIT.duration;
  const auditOverlap = Math.max(0, Math.min(auditEnd, PEAK_TO) - Math.max(state.auditStart, PEAK_FROM));
  const auditComp =
    state.auditStart >= EVENING_END
      ? 100
      : state.auditStart >= PEAK_TO
        ? 65
        : auditOverlap >= AUDIT.duration
          ? state.auditStart === AUDIT.planned
            ? 5
            : 20
          : 45;
  const inPeakShare = flexMinutes > 0 ? flexInPeak / flexMinutes : null;
  const flexFocus = inPeakShare === null ? 60 : lin(inPeakShare, 0.45, 0.9);
  const receivingPrompt = receiving && !receiving.skipped ? 100 : 0;
  const prioritisation = Math.round(0.5 * auditComp + 0.3 * flexFocus + 0.2 * receivingPrompt);

  /* ── Resource discipline ── */
  const spend = flexCost(state);
  const usefulShare = flexMinutes > 0 ? flexUseful / flexMinutes : 1;
  const over = Math.max(0, spend - FLEX_BUDGET);
  const spendComp =
    over > 0
      ? Math.max(0, 100 - (over / FLEX_BUDGET) * 160 - (1 - usefulShare) * 20)
      : Math.max(0, 100 - (1 - usefulShare) * 60);
  const sourced = ridersSourced(state);
  const ridersSpend = riderCost(state);
  const usefulRiders = Math.min(sourced, 8);
  const riderRatio = ridersSpend > 0 ? Math.min(1, cheapestRiderCost(usefulRiders) / ridersSpend) : 1;
  const check = 165;
  const surplus = riderHeadcount(state, check).count - Math.ceil(riderNeedAt(check, true));
  const riderComp = Math.max(0, 100 * riderRatio - Math.max(0, surplus - 2) * 12);
  const resourceDiscipline = Math.round(0.55 * spendComp + 0.45 * riderComp);

  const dims: Record<Day3Dimension, number> = {
    workforcePlanning,
    skillMatching,
    adaptability,
    peopleJudgement,
    communicationTrust,
    prioritisation,
    resourceDiscipline,
  };

  const breaches: Day3Breach[] = [];
  if (receiving?.skipped) {
    breaches.push({
      id: "hv-unreceived",
      label: "High-value electronics left in the vehicle through the peak",
      severity: 0.9,
    });
  } else if (receiving && !receiving.authorised) {
    breaches.push({
      id: "hv-unauthorised",
      label: "High-value stock received by an associate who is not authorised",
      severity: 0.88,
    });
  }

  const weighted = DAY_THREE_DIMENSIONS.reduce(
    (sum, dimension) => sum + dims[dimension] * DAY_THREE_WEIGHTS[dimension],
    0,
  );
  const integrity = breaches.reduce((multiplier, breach) => multiplier * breach.severity, 1);
  const score = Math.max(0, Math.min(100, Math.round(Math.max(SOFT_FLOOR, weighted * integrity))));

  const competencies: CompetencyScore[] = DAY_THREE_DIMENSIONS.map((dimension) => ({
    dimension,
    label: DAY_THREE_DIMENSION_LABEL[dimension],
    score: Math.max(SOFT_FLOOR, dims[dimension]),
    blurb: DAY_THREE_DIMENSION_BLURB[dimension],
  }));

  const risks = {
    fatigue: (morning >= 3 ? "High" : morning >= 1 ? "Moderate" : "Low") as "Low" | "Moderate" | "High",
    untrained,
    expertDependency,
    unnecessaryRemoval: state.faisal.includes("remove") || riyaHas(state.people.riya, "remove"),
  };

  const assessment: Day3Assessment = {
    dims,
    competencies,
    score,
    band: day3Band(score),
    breaches,
    tags: [],
    style: { name: "", blurb: "" },
    peak,
    anticipation,
    skillUtilisation,
    flex: {
      cost: spend,
      hours: flexMinutes / 60,
      usefulHours: flexUseful / 60,
      matched,
      bookings,
      inPeakShare,
    },
    riders: { cost: ridersSpend, sourced, morning },
    people: {
      arjunOutcome: state.people.arjun.outcome ?? "unaddressed",
      arjunCommunication: arjunComm,
      riya,
      balance: peopleInsight,
    },
    risks,
    parts: {
      forecastWeak,
      forecastGain,
      lateGap,
      lateNeeded,
      lateRatio,
      receivingComp,
      auditComp,
      faisal,
      worstMismatch: worstValue < 0.85 ? worstMismatch : null,
    },
  };

  assessment.tags = deriveTags(state, assessment);
  assessment.style = managementStyle(state, assessment);
  return assessment;
}

/* ── Behavioural tags ─────────────────────────────────────────────────── */

function deriveTags(state: Day3State, a: Day3Assessment): Day3Tag[] {
  const tags: Day3Tag[] = [];
  const add = (tag: Day3Tag, when: boolean) => {
    if (when) tags.push(tag);
  };
  const core = state.core?.covInitial;
  const peak = a.peak.peak;
  const receiving = state.receiving;

  add(
    "balanced_core_staffing",
    Boolean(
      core &&
        (["picking", "packing", "dispatch"] as Station[]).every(
          (station) => core[station] >= 0.84 && core[station] <= 1.3,
        ),
    ),
  );
  add(
    "overstaffed_picking",
    Boolean(core && core.picking - core.packing > 0.25) || (peak.picking > 1.2 && peak.packing < 0.9),
  );
  add("understaffed_packing", peak.packing < 0.88);
  add("dispatch_uncovered", peak.dispatch < 0.8 || a.peak.abandoned === "dispatch");
  add(
    "used_cross_training",
    placements(state).some(
      ({ worker, station }) =>
        worker.kind === "regular" && station !== bestStation(worker) && worker.skills[station] >= 2,
    ) ||
      state.transfers.some((transfer) => {
        const worker = REGULARS.find((candidate) => candidate.id === transfer.workerId);
        return Boolean(
          worker &&
            transfer.reason === "backfill" &&
            transfer.to !== "receiving" &&
            worker.skills[transfer.to] >= 2 &&
            transfer.to !== bestStation(worker),
        );
      }),
  );
  add("forecast_plan_adjusted", state.forecastResponse === "adjusted");
  add(
    "forecast_change_ignored",
    state.forecastResponse === "kept" &&
      a.parts.forecastWeak &&
      !(state.planningCoverage && minStation(state.planningCoverage) >= 0.95),
  );
  add("flex_worker_skill_matched", a.flex.bookings > 0 && a.flex.matched / a.flex.bookings >= 0.75);
  add("overspent_flex_budget", a.flex.cost > FLEX_BUDGET);
  add("undercovered_peak", a.peak.criticalCoverage < 0.9);
  add("rider_gap_solved_early", Boolean(state.planningCoverage && state.planningCoverage.riders >= 0.97));
  add("borrowed_nearby_riders", state.riders.nearby > 0);
  add("excessive_morning_rider_recall", state.riders.morning >= 3);
  add("fatigue_risk_created", state.riders.morning >= 2);
  add("high_value_task_covered", Boolean(receiving && !receiving.skipped && receiving.authorised));
  add("high_value_control_ignored", Boolean(receiving && (receiving.skipped || !receiving.authorised)));
  if (receiving?.workerId === "arjun") {
    const needed = receiving.before - receiving.unfilled >= 0.04;
    add("expert_picker_backfilled", Boolean(receiving.backfillId) || !needed);
    add("expert_picker_not_backfilled", !receiving.backfillId && needed);
  }
  add("faisal_coached", state.faisal.includes("coach") || state.faisal.includes("pair"));
  add("faisal_role_adjusted", state.faisal.includes("zone") || state.faisal.includes("pair"));
  add("faisal_removed_unnecessarily", state.faisal.includes("remove"));
  add("untrained_reassignment", a.risks.untrained > 0);
  add("audit_moved_to_lean_shift", state.auditStart >= EVENING_END);
  add(
    "audit_left_during_peak",
    state.auditStart < PEAK_TO && state.auditStart + AUDIT.duration > PEAK_FROM,
  );
  add("adapted_to_late_worker", a.parts.lateRatio !== null && a.parts.lateRatio >= 0.7);
  add("failed_to_replace_late_worker", a.parts.lateRatio !== null && a.parts.lateRatio < 0.3);
  add("manager_overinvolved", state.managerCovered);
  add(
    "strong_delegation",
    !state.managerCovered &&
      (Boolean(receiving?.backfillId) || (a.parts.lateRatio !== null && a.parts.lateRatio >= 0.7)),
  );
  add(
    "used_temporary_transfer",
    Boolean(receiving?.backfillId) ||
      state.transfers.some((transfer) => transfer.reason === "late-cover" && transfer.workerId !== "you"),
  );
  add("shift_locked_by_clock", state.lockedBy === "clock");

  const arjun = state.people.arjun;
  const riya = state.people.riya;
  add("arjun_issue_opened", arjun.opened);
  add("arjun_conversation_private", arjun.location === "aside");
  add("arjun_issue_handled_publicly", arjun.location === "here");
  add("arjun_status_checked", arjun.incentiveChecked);
  add("arjun_performance_checked", arjun.performanceChecked);
  add("acted_before_verifying", arjun.actedBeforeVerifying);
  add("arjun_achievement_acknowledged", arjun.response.acknowledge === "achievement");
  add("arjun_payment_status_explained", accurateStatus(arjun));
  add(
    "arjun_unverified_promise",
    arjun.response.clarify === "guarantee" || (statedStatus(arjun) && !arjun.incentiveChecked),
  );
  add(
    "arjun_overtime_requested_respectfully",
    arjun.response.request === "able-to" || arjun.response.request === "extend",
  );
  add(
    "arjun_overtime_pressured",
    arjun.response.request === "must-stay" || arjun.response.request === "replace",
  );
  add("arjun_overtime_extended", arjun.outcome === "extended");
  add("arjun_overtime_declined", arjun.outcome === "held" || arjun.outcome === "refused");
  add("arjun_overtime_not_requested", arjun.outcome === "not-asked");
  add("arjun_issue_unaddressed", arjun.outcome === "unaddressed");

  add("riya_profile_opened", riya.opened);
  add("riya_trend_reviewed", riya.trendViewed);
  add("riya_zone_data_checked", riya.zonesViewed);
  add("riya_zone_c_pattern_found", riya.zoneCFound);
  add(
    "riya_accuracy_considered",
    riya.zoneCFound && !riyaHas(riya, "remove") && !riyaHas(riya, "packing"),
  );
  add("riya_moved_to_familiar_zone", riyaHas(riya, "zone"));
  add("riya_paired_with_expert", riyaHas(riya, "pair"));
  add("riya_coaching_scheduled", riyaHas(riya, "coach"));
  add("riya_removed_unnecessarily", riyaHas(riya, "remove"));
  add("riya_warned_without_diagnosis", riyaHas(riya, "warn") && !riya.zoneCFound);
  add("riya_untrained_role_assigned", riyaHas(riya, "packing"));
  add("riya_left_unchanged", riya.applied && riyaHas(riya, "keep") && riya.interventions.length === 1);
  return tags;
}

/**
 * When each tag becomes true of the evening. A mid-shift telemetry event must
 * not say the audit was left in the peak before anyone has seen the audit.
 */
const TAG_PHASE: Partial<Record<Day3Tag, Phase>> = {
  balanced_core_staffing: "forecast",
  overstaffed_picking: "forecast",
  forecast_plan_adjusted: "flex",
  forecast_change_ignored: "late",
  flex_worker_skill_matched: "riders",
  overspent_flex_budget: "flex",
  rider_gap_solved_early: "late",
  borrowed_nearby_riders: "riders",
  excessive_morning_rider_recall: "riders",
  fatigue_risk_created: "riders",
  arjun_issue_opened: "arjun",
  arjun_conversation_private: "arjun",
  arjun_issue_handled_publicly: "arjun",
  arjun_status_checked: "arjun",
  arjun_performance_checked: "arjun",
  acted_before_verifying: "arjun",
  arjun_achievement_acknowledged: "arjun",
  arjun_payment_status_explained: "arjun",
  arjun_unverified_promise: "arjun",
  arjun_overtime_requested_respectfully: "arjun",
  arjun_overtime_pressured: "arjun",
  arjun_overtime_extended: "arjun",
  arjun_overtime_declined: "arjun",
  arjun_overtime_not_requested: "arjun",
  arjun_issue_unaddressed: "peak",
  riya_profile_opened: "riya",
  riya_trend_reviewed: "riya",
  riya_zone_data_checked: "riya",
  riya_zone_c_pattern_found: "riya",
  riya_accuracy_considered: "riya",
  riya_moved_to_familiar_zone: "riya",
  riya_paired_with_expert: "riya",
  riya_coaching_scheduled: "riya",
  riya_removed_unnecessarily: "riya",
  riya_warned_without_diagnosis: "riya",
  riya_untrained_role_assigned: "riya",
  riya_left_unchanged: "receiving",
  adapted_to_late_worker: "receiving",
  failed_to_replace_late_worker: "receiving",
  manager_overinvolved: "receiving",
  high_value_task_covered: "faisal",
  high_value_control_ignored: "faisal",
  expert_picker_backfilled: "faisal",
  expert_picker_not_backfilled: "faisal",
  used_temporary_transfer: "faisal",
  strong_delegation: "faisal",
  faisal_coached: "audit",
  faisal_role_adjusted: "audit",
  faisal_removed_unnecessarily: "audit",
  audit_moved_to_lean_shift: "review",
  audit_left_during_peak: "review",
  understaffed_packing: "peak",
  dispatch_uncovered: "peak",
  undercovered_peak: "peak",
  shift_locked_by_clock: "peak",
};

/** The tags that are already true of the evening so far. */
export function tagsSoFar(state: Day3State): Day3Tag[] {
  return assessDay3(state).tags.filter((tag) => {
    const phase = TAG_PHASE[tag];
    return !phase || reached(state, phase);
  });
}

/* ── Management style ─────────────────────────────────────────────────── */

interface StyleRule {
  name: string;
  blurb: string;
  test: (state: Day3State, a: Day3Assessment) => boolean;
}

/**
 * Deterministic, checked in order. Specific failure shapes sit above the
 * general ones so an unusual evening gets a name that describes it.
 */
const STYLES: StyleRule[] = [
  {
    name: "Out of Time · Plan Unfinished",
    blurb:
      "The clock locked the plan before you did. The evening's later surprises ran on the floor lead's defaults — which is what happens to a plan nobody finishes.",
    test: (state) => state.lockedBy === "clock",
  },
  {
    name: "High-Capacity Spender",
    blurb:
      "Every gap closed, mostly by buying capacity. The peak was covered; the budget was not the constraint you treated it as.",
    test: (_state, a) => a.flex.cost > FLEX_BUDGET && a.dims.workforcePlanning >= 65,
  },
  {
    name: "High-Capacity · Low-Trust Manager",
    blurb:
      "The stations had the capacity they needed. The two people who asked you for something got an answer that was not checked, not true, or not a request — and capacity built that way does not come back next festival.",
    test: (_state, a) => a.dims.workforcePlanning >= 70 && a.dims.communicationTrust < 45,
  },
  {
    name: "Headcount Manager · Skills Second",
    blurb:
      "The stations had people. They did not always have the right people — experts sat where their skill added little, and the coverage was thinner than the headcount suggested.",
    test: (_state, a) => a.dims.skillMatching < 55,
  },
  {
    name: "Lean Resource Optimiser",
    blurb:
      "Careful with every rupee, and the peak felt it. Some of the gaps you saved money on were the ones the evening fell into.",
    test: (_state, a) =>
      a.flex.cost <= 600 && a.dims.resourceDiscipline >= 80 && a.peak.criticalCoverage < 0.9,
  },
  {
    name: "Strong Planner · Hesitant Coach",
    blurb:
      "The roster was sound and the peak was covered. Faisal was handled as a staffing problem rather than a person with a pace that could be developed.",
    test: (_state, a) => a.dims.workforcePlanning >= 60 && a.dims.peopleJudgement < 50,
  },
  {
    name: "Reactive Fire-Fighter",
    blurb:
      "You got there in the end, but most of the predictable gaps were closed after the evening had started breaking the plan rather than before.",
    test: (_state, a) => a.anticipation < 0.5 && a.peak.criticalCoverage >= 0.86,
  },
  {
    name: "Reactive People Manager",
    blurb:
      "Both people decisions were made before the evidence was in — an incentive status unchecked, a zone breakdown unopened. Deciding quickly about a person is not the same as deciding well.",
    test: (state, a) =>
      state.people.arjun.actedBeforeVerifying &&
      !state.people.riya.zoneCFound &&
      a.dims.communicationTrust < 75,
  },
  {
    name: "Expert-Dependent Manager",
    blurb:
      "Your plan leaned on Arjun. It held while he was on the floor, and sagged the moment the evening needed him at the vehicle with nobody moved in behind him.",
    test: (_state, a) => a.risks.expertDependency,
  },
  {
    name: "People-First · Capacity Light",
    blurb:
      "You treated people well — Arjun, Faisal, Riya, the morning riders. Nobody was pushed, and nothing much changed either: the peak needed more capacity than the plan gave it.",
    test: (_state, a) =>
      (a.dims.peopleJudgement >= 80 || a.people.balance.label === "HIGH TRUST / LOW ACCOUNTABILITY") &&
      a.dims.workforcePlanning < 62,
  },
  {
    name: "Calm Coach · Clear Operator",
    blurb:
      "You checked before you answered, asked instead of ordering, and moved a slow picker's work rather than the picker. The peak was covered by a team that knew exactly where it stood.",
    test: (_state, a) =>
      a.dims.communicationTrust >= 80 && a.dims.peopleJudgement >= 80 && a.dims.workforcePlanning >= 72,
  },
  {
    name: "Adaptive Floor Leader",
    blurb:
      "Built early, rebuilt calmly. When the forecast moved, a temp was late and the vehicle arrived, the plan bent without breaking — and the people in it were treated as people.",
    test: (_state, a) =>
      a.dims.adaptability >= 85 && a.dims.workforcePlanning >= 80 && a.dims.peopleJudgement >= 70,
  },
  {
    name: "Balanced Workforce Planner",
    blurb:
      "No single spike and no single hole. Skills, timing and cost were weighed against each other rather than one of them being allowed to win.",
    test: () => true,
  },
];

function managementStyle(state: Day3State, a: Day3Assessment): { name: string; blurb: string } {
  const rule = STYLES.find((candidate) => candidate.test(state, a));
  return rule ? { name: rule.name, blurb: rule.blurb } : { name: "Balanced Workforce Planner", blurb: "" };
}

/**
 * Day 3 read against the five competencies every day reports into, so a
 * week-long profile can be assembled without knowing how each day scores.
 */
export function operatorCompetencies(a: Day3Assessment): Record<string, number> {
  const mean = (...values: number[]) => Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return {
    team: mean(
      a.dims.workforcePlanning,
      a.dims.skillMatching,
      a.dims.peopleJudgement,
      a.dims.communicationTrust,
    ),
    priority: mean(a.dims.prioritisation, a.dims.adaptability),
    customer: lin(a.peak.serviceRate, 0.82, 0.995),
    inventory: mean(a.parts.auditComp, a.parts.receivingComp),
    reasoning: mean(a.dims.skillMatching, a.dims.adaptability),
  };
}
