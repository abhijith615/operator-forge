import { initialState, unitEvidence } from "./engine";
import { floorLeadSays, formFor } from "./forms";
import { CTD_TARGET, PEAK_AT, SCHEDULE, clockLabel, floorHolding, isLocked, projectedPeak, taskFit } from "./model";
import { BY_ID, ROSTER, STATION_LABEL, STATION_PLACE, nameOf } from "./roster";
import {
  type EvidenceEvent,
  type EvidenceType,
  type HiringState,
  type Intervention,
  type SceneId,
  type Stage,
} from "./types";
import {
  ASSESSMENT_VERSION,
  COMPETENCIES,
  COMPETENCY_LABEL,
  assessmentWeights,
  type CompetencyId,
} from "./weights";

/**
 * From what happened to what it is evidence of.
 *
 * Every rule here is deterministic and reads only what the engine recorded.
 * No model assigns a score, adjusts one, or decides a flag. The employer's
 * question about any number on the profile — "why?" — has an answer that is a
 * time, a state, an action and a consequence, because that is all a score is
 * built from.
 *
 * Three things this deliberately does not do. It does not score how quickly
 * somebody tapped: timing is always operational ("before the queue breached"),
 * never wall-clock. It does not reward knowing the right thing without doing
 * it. And it does not reject anybody: a control breach raises a flag for a
 * person to look at.
 */

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** "a", "a and b", "a, b and c". */
function listed(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
const at = (clock: number | null) => (clock === null ? "" : clockLabel(clock));

/** A stage, as it reads in the middle of a sentence. */
const STAGE_WORD: Record<Stage, string> = {
  picking: "picking",
  putaway: "putaway",
  auditing: "auditing",
  riders: "the rider handover",
};

type Draft = Omit<EvidenceEvent, "evidenceType" | "opportunityToDemonstrate"> & {
  counter?: boolean;
  /** The moment never arose, or the candidate never reached it. */
  missed?: boolean;
};

function typed(draft: Draft): EvidenceEvent {
  const { counter, missed, ...rest } = draft;
  const evidenceType: EvidenceType = missed
    ? "NOT_SHOWN"
    : counter
      ? "COUNTER_EVIDENCE"
      : rest.score === 3
        ? "DEMONSTRATED"
        : rest.score === 0
          ? "NOT_SHOWN"
          : "PARTIAL";
  return { ...rest, evidenceType, opportunityToDemonstrate: !missed };
}

const notReached = (
  behaviourId: string,
  competencyId: CompetencyId,
  title: string,
  claim: string,
): Draft => ({
  behaviourId,
  competencyId,
  title,
  claim,
  simTime: null,
  stateBefore: "The shift ended before this point.",
  candidateAction: "No decision was made.",
  timingContext: "Not reached",
  stateAfter: "—",
  score: 0,
  behaviourTags: ["not_reached"],
  missed: true,
});

/* ── Team ─────────────────────────────────────────────────────────────── */

/** What the board said about the floor the night shift left. */
function inheritedFloor(state: HiringState): Record<Stage, number> {
  return projectedPeak(initialState(state.form));
}

function teamEvents(state: HiringState): Draft[] {
  const out: Draft[] = [];
  const C: CompetencyId = "teamManagement";
  const was = inheritedFloor(state);

  /* T1 · covers every critical station */
  if (!state.floor) {
    out.push(notReached("T1", C, "Station coverage", "Covers all critical operating stations."));
  } else {
    const p = state.floor.projected;
    const uncovered = state.floor.uncovered;
    // The three an order depends on: somebody to pick it, stock in the bin, a rider to take it.
    const lowest = Math.min(p.picking, p.putaway, p.riders);
    const score = uncovered.length ? 0 : lowest >= 0.85 ? 3 : lowest >= 0.8 ? 2 : lowest >= 0.55 ? 1 : 0;
    out.push({
      behaviourId: "T1",
      competencyId: C,
      title: score === 3 ? "Built a floor that covered picking, putaway and riders" : uncovered.length ? "Left a workflow with nobody on it" : "Left one part of the store thin going into the rush",
      claim: "Covers all critical operating stations.",
      simTime: state.floor.lockedAt,
      stateBefore: `Inherited floor: picking ${pct(was.picking)}, putaway ${pct(was.putaway)}, riders ${pct(was.riders)} of the 06:30 forecast.`,
      candidateAction: `Set the floor at picking ${pct(p.picking)}, putaway ${pct(p.putaway)}, riders ${pct(p.riders)}.`,
      timingContext: "Before the breakfast build",
      stateAfter: uncovered.length ? `Nobody assigned to ${uncovered.map((s) => STATION_LABEL[s]).join(", ")}.` : `Weakest at ${pct(lowest)} of forecast.`,
      score: score as 0 | 1 | 2 | 3,
      behaviourTags: uncovered.length ? ["station_uncovered"] : score === 3 ? ["balanced_floor"] : ["thin_station"],
      counter: uncovered.length > 0,
    });
  }

  /* T2 · matches people to jobs */
  if (!state.floor) {
    out.push(notReached("T2", C, "Skill-to-role matching", "Matches people to jobs based on capability."));
  } else {
    const misplaced = ROSTER.filter((e) => {
      const station = state.assign[e.id];
      return station !== undefined && e.id !== "riya" && e.skills[station] < 0.75;
    });
    const score = misplaced.length === 0 ? 3 : misplaced.length === 1 ? 2 : misplaced.length === 2 ? 1 : 0;
    out.push({
      behaviourId: "T2",
      competencyId: C,
      title: score === 3 ? "Put trained people where they were trained" : "Left people working outside what they are trained for",
      claim: "Matches people to jobs based on capability.",
      simTime: state.floor.lockedAt,
      stateBefore: "Twelve associates, each trained for one or two of picking, putaway and auditing.",
      candidateAction:
        misplaced.length === 0
          ? "Every associate is on work they are trained for."
          : `${misplaced.map((e) => `${e.name} on ${STATION_LABEL[state.assign[e.id]!].toLowerCase()}`).join("; ")} — outside their training.`,
      timingContext: "Floor build",
      stateAfter: `${12 - misplaced.length} of 12 on work they are trained for.`,
      score: score as 0 | 1 | 2 | 3,
      behaviourTags: score === 3 ? ["skill_matched"] : ["skill_mismatch"],
    });
  }

  /* T3 · builds enough peak capacity */
  if (!state.absence) {
    out.push(notReached("T3", C, "Peak capacity", "Builds sufficient peak capacity."));
  } else {
    const { projectedMin, pickingProjected, choices } = state.absence;
    const over = choices.includes("onDemand") && pickingProjected >= 1.18;
    let score = projectedMin >= 0.93 ? 3 : projectedMin >= 0.85 ? 2 : projectedMin >= 0.8 ? 1 : 0;
    if (over && score === 3) score = 2;
    const did: Record<string, string> = {
      onDemand: state.agency > 1 ? `called in ${state.agency} agency pickers by the hour` : "called in an agency picker by the hour",
      reallocate: "reallocated internally",
      extend: "asked an overnight associate to stay",
      short: "chose to run short",
    };
    out.push({
      behaviourId: "T3",
      competencyId: C,
      title: score === 3 ? "Closed the staffing gap before the peak" : over ? "Covered the gap, and paid for more picking than the peak needed" : "Went into the peak short",
      claim: "Builds sufficient peak capacity.",
      simTime: state.absence.at,
      stateBefore: "Two of fourteen absent, demand forecast +38% at 06:30.",
      candidateAction: `Candidate ${listed(choices.map((c) => did[c]!)) || "took no action"}.`,
      timingContext: "Thirty minutes before the peak",
      stateAfter: `Weakest of picking, putaway and riders projected at ${pct(projectedMin)} for 06:30.`,
      score: score as 0 | 1 | 2 | 3,
      behaviourTags: over ? ["overstaffed"] : score >= 2 ? ["capacity_built"] : ["understaffed"],
    });
  }

  /* T4 · preserves flexible capacity */
  if (!state.floor) {
    out.push(notReached("T4", C, "Flexible reserve", "Preserves flexible, cross-trained capacity."));
  } else {
    const reserve = state.floor.reserve;
    const p = state.floor.projected;
    const thin = Math.min(p.picking, p.putaway, p.riders) < 0.8;
    // Devices that are open because the floor is lopsided are not a reserve.
    const score = thin ? Math.min(1, reserve.length) : reserve.length >= 2 ? 3 : reserve.length === 1 ? 2 : 0;
    out.push({
      behaviourId: "T4",
      competencyId: C,
      title: score === 3 ? "Left devices open for the rush without starving their own work" : score === 2 ? "Left one device the app could call on" : thin ? "Had hands spare in one place while another ran short" : "Built a floor with nobody the app could call on",
      claim: "Preserves flexible, cross-trained capacity.",
      simTime: state.absence?.at ?? state.floor.lockedAt,
      stateBefore: "An unlocked device on putaway or auditing is sent orders when volume spikes. A locked one never is.",
      candidateAction:
        reserve.length > 0
          ? `${reserve.map(nameOf).join(", ")} ${reserve.length === 1 ? "was" : "were"} left unlocked, on work that could spare them.`
          : "No device was left where the app could send it orders without starving its own work.",
      timingContext: "Going into the morning",
      stateAfter: thin ? `${reserve.length} open to orders, with part of the store under 80% of forecast.` : `Flexible reserve: ${reserve.length}.`,
      score: score as 0 | 1 | 2 | 3,
      behaviourTags: score >= 2 ? ["reserve_kept"] : ["no_reserve"],
    });
  }

  /* T5 and T6 · Riya */
  const choices = state.riya.choices;
  if (!choices) {
    out.push(notReached("T5", C, "Performance diagnosis", "Diagnoses employee performance correctly."));
    out.push(notReached("T6", C, "Developing people", "Develops people rather than simply removing them."));
  } else {
    const developed = choices.includes("lockPutaway") || choices.includes("pair") || choices.includes("phaseLater");
    const punitive = choices.includes("warn") || choices.includes("returnAgency") || choices.includes("target");
    const t5 = punitive ? 0 : developed ? (state.riya.inspected ? 3 : 2) : state.riya.inspected ? 1 : 0;
    const label: Record<string, string> = {
      lockPutaway: "locked her device to putaway",
      pair: "paired her with a putaway hand to learn the bins",
      phaseLater: "planned her first picking shift for after the rush",
      keep: "left things as they were",
      target: "kept her on orders with the 16-second target",
      returnAgency: "sent her back to the agency",
      warn: "issued a performance warning",
    };
    out.push({
      behaviourId: "T5",
      competencyId: C,
      title: t5 === 3 ? "Read the record and found an induction problem, not a people problem" : punitive ? "Treated an induction slip as a performance problem" : "Acted on Riya without reading her record",
      claim: "Diagnoses employee performance correctly.",
      simTime: when(state, "riya"),
      stateBefore: "Floor Lead: \"Riya did thirty-one seconds an item this morning. Should I send her back to the agency?\" Day 2; her induction is putaway only; her device had been unlocked at 05:10 and the app had sent her 14 orders; no mis-picks.",
      candidateAction: `${state.riya.inspected ? "Opened her record, then" : "Without opening her record,"} ${choices.map((c) => label[c]).join(" and ")}.`,
      timingContext: "On her second day",
      stateAfter: punitive ? "The cause — a new joiner's device left open to orders — was not addressed." : developed ? "The cause was identified as the device and the induction, not ability." : "No change.",
      score: t5 as 0 | 1 | 2 | 3,
      behaviourTags: punitive ? ["misdiagnosed"] : state.riya.inspected ? ["evidence_before_people_decision"] : ["acted_without_data"],
      counter: choices.includes("warn") || choices.includes("returnAgency"),
    });

    const t6 = punitive ? 0 : choices.includes("pair") || (choices.includes("lockPutaway") && choices.includes("phaseLater")) ? 3 : choices.includes("lockPutaway") || choices.includes("phaseLater") ? 2 : 1;
    const riyaLater = state.outcome?.riyaOutput ?? 0;
    out.push({
      behaviourId: "T6",
      competencyId: C,
      title: t6 === 3 ? "Developed a new joiner instead of removing her" : punitive ? "Pressed, warned or removed a new joiner on her second day" : t6 === 2 ? "Protected a new joiner, with half a development plan" : "Left a new joiner to work it out alone",
      claim: "Develops people rather than simply removing them.",
      simTime: when(state, "riya"),
      stateBefore: "Riya's putaway rate: 55% of a trained hand. On orders: 32 seconds an item against a 16-second standard.",
      candidateAction: `Candidate ${choices.map((c) => label[c]).join(" and ")}.`,
      timingContext: "Before the peak",
      stateAfter: riyaLater > 0 ? `By 06:40 she was putting away at ${pct(riyaLater)} of a trained hand.` : "By 06:40 she was not on putaway.",
      laterConsequence:
        riyaLater >= 0.8
          ? "Putaway held through the rush with Riya carrying a near-full load."
          : state.assign.riya === undefined
            ? "Putaway went into the rush a hand short."
            : state.riya.leftAt !== null
              ? "She did not come back from her break. The agency says she is not returning."
              : !isLocked(state, "riya")
                ? "The app kept sending her orders through the rush, and the crates she was on stayed on the dock."
                : "She stayed on putaway at a learner's pace through the rush.",
      score: t6 as 0 | 1 | 2 | 3,
      behaviourTags: t6 === 3 ? ["developed_people"] : punitive ? ["removed_not_developed"] : ["partial_development"],
      counter: choices.includes("warn") || choices.includes("returnAgency"),
    });
  }

  /* T7 and T8 · Arjun */
  const reply = state.arjun.response;
  if (!reply) {
    out.push(notReached("T7", C, "Handling conflict", "Handles conflict without damaging throughput."));
    out.push(notReached("T8", C, "Honest communication", "Communicates honestly and preserves trust."));
  } else {
    const harsh = reply.request === "threat" ? 2 : reply.request === "order" || reply.ack === "dismiss" ? 1 : 0;
    const t7 = harsh === 2 ? 0 : harsh === 1 ? 1 : state.arjun.place === "aside" ? 3 : 2;
    out.push({
      behaviourId: "T7",
      competencyId: C,
      title: t7 === 3 ? "Took a grievance off the floor and settled it" : harsh ? "Met a grievance with pressure" : "Handled a grievance in front of the other pickers",
      claim: "Handles conflict without damaging throughput.",
      simTime: when(state, "arjun"),
      stateBefore: "Arjun, the store's fastest picker, at the end of an overnight shift: \"Last week's incentive still hasn't come. Why should I stay on for your rush?\"",
      candidateAction: `Spoke to him ${state.arjun.place === "aside" ? "away from the other pickers" : "on the floor"}${harsh === 2 ? ", and threatened his record" : harsh === 1 ? ", and overrode him" : ""}.`,
      timingContext: "Twenty-five minutes before the peak",
      stateAfter: `Arjun: ${ARJUN_STATE[state.arjun.outcome]}.`,
      score: t7 as 0 | 1 | 2 | 3,
      behaviourTags: harsh ? ["pressure_response"] : ["deescalated"],
      counter: harsh === 2,
    });

    const honest = reply.clarify === "verified" || reply.clarify === "willCheck";
    const t8 =
      reply.request === "threat" || reply.ack === "dismiss" || reply.clarify === "deflect"
        ? 0
        : reply.clarify === "promise"
          ? 1
          : honest && reply.ack === "recognise" && reply.request === "respectful"
            ? 3
            : honest
              ? 2
              : 1;
    out.push({
      behaviourId: "T8",
      competencyId: C,
      title: t8 === 3 ? "Told an associate only what had been verified" : reply.clarify === "promise" ? "Made a promise outside the manager's control" : t8 === 0 ? "Dismissed or deflected a legitimate concern" : "Answered without checking the facts",
      claim: "Communicates honestly and preserves trust.",
      simTime: when(state, "arjun"),
      stateBefore: state.arjun.checked.includes("incentiveStatus")
        ? "Checked first: target achieved, approved, payment pending, expected tomorrow."
        : "Did not check the incentive status before answering.",
      candidateAction: `${ACK[reply.ack]} ${CLARIFY[reply.clarify]} ${REQUEST[reply.request]}`,
      timingContext: "In the conversation",
      stateAfter: `Team trust ${state.trust >= 66 ? "rose" : state.trust <= 56 ? "fell" : "held"}. Arjun: ${ARJUN_STATE[state.arjun.outcome]}.`,
      laterConsequence:
        state.arjun.outcome === "willing"
          ? "He stayed through the peak and covered other work at full pace when asked."
          : state.arjun.outcome === "leaving"
            ? "He left at 06:30, as the peak began."
            : "He stayed, and covered other work more slowly than he can.",
      score: t8 as 0 | 1 | 2 | 3,
      behaviourTags: reply.clarify === "promise" ? ["unsupported_promise"] : t8 === 3 ? ["honest_verified"] : t8 === 0 ? ["dismissive"] : ["unverified_answer"],
      counter: reply.request === "threat",
    });
  }

  // Work only needs an owner once the first of it arrives. Before that there
  // has been nothing to delegate and nothing to hoard.
  if (state.arrivals.case === undefined) {
    out.push(notReached("T9", C, "Delegation", "Delegates appropriate work."));
    out.push(notReached("T10", C, "Manager dependency", "Avoids unnecessary manager dependency."));
    return out;
  }

  /* T9 · delegates appropriate work */
  const good = state.delegations.filter((d) => d.appropriate);
  const poor = state.delegations.filter((d) => !d.appropriate);
  const hoarded = state.personal.filter((p) => p.delegable && p.fitAvailable);
  const decisions = good.length + poor.length + hoarded.length;
  const ratio = decisions ? good.length / decisions : 0;
  const t9 = decisions === 0 ? 0 : ratio >= 0.75 && good.length >= 3 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0;
  out.push({
    behaviourId: "T9",
    competencyId: C,
    title: t9 === 3 ? "Delegated work to the people suited to it" : poor.length > good.length ? "Delegated, often to the wrong person" : "Delegated little of what the team could have owned",
    claim: "Delegates appropriate work.",
    simTime: null,
    stateBefore: `${decisions} pieces of work in the shift could have gone to a trained associate.`,
    candidateAction: [
      good.length ? `Well placed: ${good.slice(0, 4).map((d) => `${d.label} → ${nameOf(d.owner)}`).join("; ")}.` : "",
      poor.length ? `Poorly placed: ${poor.slice(0, 3).map((d) => `${d.label} → ${nameOf(d.owner)}`).join("; ")}.` : "",
      hoarded.length ? `Kept personally: ${hoarded.slice(0, 3).map((p) => p.label.toLowerCase()).join("; ")}.` : "",
    ].filter(Boolean).join(" "),
    timingContext: "Across the shift",
    stateAfter: `${good.length} of ${decisions} delegation decisions put the work with a suited owner.`,
    score: t9 as 0 | 1 | 2 | 3,
    behaviourTags: t9 === 3 ? ["delegated_well"] : poor.length ? ["misdelegated"] : ["under_delegated"],
  });

  /* T10 · avoids unnecessary manager dependency */
  const t10 = hoarded.length <= 1 ? 3 : hoarded.length === 2 ? 2 : hoarded.length === 3 ? 1 : 0;
  out.push({
    behaviourId: "T10",
    competencyId: C,
    title: t10 === 3 ? "Ran the shift through the team" : t10 >= 1 ? "Stepped in personally more than the floor needed" : "The shift depended on the manager's own hands",
    claim: "Avoids unnecessary manager dependency.",
    simTime: null,
    stateBefore: "A trained, free associate was available for each of these.",
    candidateAction: hoarded.length ? `Did personally: ${hoarded.map((p) => `${p.label.toLowerCase()} (${at(p.at)})`).join("; ")}.` : "Did not personally take on work a trained associate was free to do.",
    timingContext: "Across the shift",
    stateAfter: `${hoarded.length} delegable task${hoarded.length === 1 ? "" : "s"} done by the manager. Each one took the manager off the floor while it lasted.`,
    score: t10 as 0 | 1 | 2 | 3,
    behaviourTags: t10 === 3 ? ["low_manager_dependency"] : ["manager_dependency"],
  });

  return out;
}

/** When the candidate actually got to a part of the shift, which may be later than it was due. */
function when(state: HiringState, scene: SceneId): number {
  return state.arrivals[scene] ?? SCHEDULE[scene];
}

/** Store time at which a kind of action was first taken. */
function actedAt(state: HiringState, eventType: string, fallback: SceneId): number {
  return state.log.find((entry) => entry.eventType === eventType)?.simTime ?? when(state, fallback);
}

const ARJUN_STATE: Record<HiringState["arjun"]["outcome"], string> = {
  pending: "not yet spoken to",
  willing: "staying through the peak, willingly",
  reluctant: "staying through the peak, reluctantly",
  resentful: "staying, resentful",
  leaving: "leaving at 06:30",
};
const ACK = { recognise: "Recognised that he had hit his target.", neutral: "Acknowledged the concern.", dismiss: "Brushed the concern aside." };
const CLARIFY = {
  verified: "Told him what the record showed: approved, payment pending, expected tomorrow.",
  willCheck: "Said they did not know yet and would check and tell him.",
  guess: "Gave an unverified explanation.",
  deflect: "Said it was payroll's problem.",
  promise: "Guaranteed the money would arrive tomorrow.",
};
const REQUEST = {
  respectful: "Asked him to stay, and left the decision with him.",
  order: "Told him he was staying.",
  threat: "Said leaving would go on his record.",
  none: "Did not ask him to stay.",
};

/* ── Inventory ────────────────────────────────────────────────────────── */

function inventoryEvents(state: HiringState): Draft[] {
  const out: Draft[] = [];
  const form = formFor(state.form);
  const hv = form.highValue;
  const k = state.kase;
  const C: CompetencyId = "inventoryManagement";
  const exposure = `₹${((hv.system - hv.physical) * hv.unitValue).toLocaleString("en-IN")}`;
  const reached = k.firstMove !== null;

  /* I1 · detects the mismatch and verifies it physically */
  if (!reached) {
    out.push(notReached("I1", C, "Physical verification", "Detects physical-system mismatch."));
  } else {
    const score = k.countOwner !== null ? 3 : 0;
    out.push({
      behaviourId: "I1",
      competencyId: C,
      title: score ? "Verified a system alert in the cage" : "Left a high-value variance uncounted",
      claim: "Detects physical-system mismatch.",
      simTime: k.openedAt,
      stateBefore: `Alert: ${hv.item}, system ${hv.system}, physical unknown, ₹${hv.unitValue.toLocaleString("en-IN")} a unit.`,
      candidateAction: score ? `Ordered a physical count (${k.countOwner === "me" ? "counted personally" : `by ${nameOf(k.countOwner!)}`}).` : "Left it for the next routine count.",
      timingContext: "On the alert",
      stateAfter: score ? `Physical ${hv.physical}. Variance −${hv.system - hv.physical}, exposure ${exposure}.` : "Variance unknown.",
      score: score as 0 | 3,
      behaviourTags: score ? ["count_initiated"] : ["variance_deferred"],
    });
  }

  /* I2 · count before conclusions */
  if (!reached) {
    out.push(notReached("I2", C, "Count before conclusions", "Establishes physical count before conclusions."));
  } else {
    const score = k.firstMove === "count" ? 3 : k.firstMove === "records" && k.countOwner !== null ? 2 : 0;
    out.push({
      behaviourId: "I2",
      competencyId: C,
      title: score === 3 ? "Established the count before theorising" : score === 2 ? "Went to the records before knowing the size of the gap" : "Never established what was physically there",
      claim: "Establishes physical count before conclusions.",
      simTime: k.openedAt,
      stateBefore: `System said ${hv.system}. Nobody had looked in the cage.`,
      candidateAction: k.firstMove === "count" ? "First action was the physical count." : k.firstMove === "records" ? "Opened the records first, and counted afterwards." : "Did not count.",
      timingContext: "First move on the case",
      stateAfter: k.countOwner !== null ? "Every later conclusion was against a known physical number." : "No physical number to reason from.",
      score: score as 0 | 2 | 3,
      behaviourTags: score === 3 ? ["count_first"] : ["reasoned_before_count"],
    });
  }

  const evidence = unitEvidence(state);
  const viewedAny = k.viewed.length > 0 || k.recordsOwner !== null;

  /* I3 · uses the records */
  if (!reached) {
    out.push(notReached("I3", C, "Using the records", "Uses relevant records and movement evidence."));
  } else {
    const found = Number(evidence.unit1) + Number(evidence.unit2);
    const score = found === 2 ? 3 : found === 1 ? 2 : viewedAny ? 1 : 0;
    out.push({
      behaviourId: "I3",
      competencyId: C,
      title: score === 3 ? "Traced two of three missing units through the records" : score === 2 ? "Traced one of the missing units" : "Did not trace the missing units",
      claim: "Uses relevant records and movement evidence.",
      simTime: k.openedAt,
      stateBefore: "Movement log, orders, scan log, access log and the exception area were all available.",
      candidateAction: k.recordsOwner ? `Had ${nameOf(k.recordsOwner)} pull the records.` : k.viewed.length ? `Opened: ${k.viewed.join(", ")}.` : "Opened none of them.",
      timingContext: "During the investigation",
      stateAfter: `${found} of the 2 explainable units were evidenced: ${evidence.unit1 ? `${hv.scanOrder} delivered without an item scan` : "missed scan not found"}; ${evidence.unit2 ? `${hv.cancelledOrder} unit found in the exception tote` : "exception tote not checked"}.`,
      score: score as 0 | 1 | 2 | 3,
      behaviourTags: score === 3 ? ["evidence_traced"] : ["evidence_incomplete"],
    });
  }

  /* I4 and I5 · the disposition */
  const d = k.disposition;
  if (!d) {
    const missed = !reached;
    for (const [id, title, claim] of [
      ["I4", "Explained, recovered, unresolved", "Distinguishes explained, recovered and unresolved inventory."],
      ["I5", "High-value control", "Follows high-value control logic."],
      ["I8", "Restoring the control", "Restores a control that reduces recurrence."],
    ] as const) {
      out.push(
        missed
          ? notReached(id, C, title, claim)
          : {
              behaviourId: id,
              competencyId: C,
              title: `${title}: case left open`,
              claim,
              simTime: k.openedAt,
              stateBefore: "The variance was in front of the candidate.",
              candidateAction: "No disposition was made.",
              timingContext: "Case deferred or left unfinished",
              stateAfter: "Nothing was classified, controlled or fixed.",
              score: 0,
              behaviourTags: ["case_left_open"],
            },
      );
    }
  } else {
    // The three units are interchangeable: what matters is how many were put
    // in each pile, and whether the evidence for that pile was in hand.
    const pile = (call: string) => d.units.filter((unit) => unit === call).length;
    const unsound = pile("theft") + pile("writeoff") > 0;
    const right =
      Number(pile("explained") === 1 && evidence.unit1) +
      Number(pile("recovered") === 1 && evidence.unit2) +
      Number(pile("unresolved") >= 1 && !unsound);
    const named = (["explained", "recovered", "unresolved", "writeoff", "theft"] as const)
      .filter((call) => pile(call) > 0)
      .map((call) => `${pile(call)} ${UNIT_CALL[call]}`)
      .join(", ");
    out.push({
      behaviourId: "I4",
      competencyId: C,
      title: right === 3 ? "Separated what was explained, recovered and still missing" : "Did not keep the three units apart",
      claim: "Distinguishes explained, recovered and unresolved inventory.",
      simTime: actedAt(state, "disposition", "nilpick"),
      stateBefore: `Three units short. Exposure ${exposure}.`,
      candidateAction: `Accounted for the three as: ${named}.`,
      timingContext: "Closing the case",
      stateAfter: `${right} of 3 called correctly on the evidence held. Truth: one process variance, one recovered, one unresolved.`,
      score: right as 0 | 1 | 2 | 3,
      behaviourTags: right === 3 ? ["variance_classified"] : ["variance_blurred"],
    });

    const bad = d.steps.filter((s) => s === "accuse" || s === "writeOff" || s === "closeStore");
    const called = unsound;
    const sound = d.steps.filter((s) => s === "preserve" || s === "controlAccess" || s === "escalate").length;
    const i5 = bad.length || called ? 0 : sound;
    const step: Record<string, string> = {
      preserve: "preserved the footage and logs",
      controlAccess: "restricted the cage to supervised issue",
      escalate: "escalated to loss prevention",
      accuse: "named an associate as responsible",
      writeOff: "wrote the unit off",
      closeStore: "stopped order release to search the store",
    };
    out.push({
      behaviourId: "I5",
      competencyId: C,
      title: i5 === 3 ? "Controlled an unresolved high-value loss without stopping the store" : bad.length || called ? "Closed an unresolved loss without evidence" : "Left the unresolved unit partly controlled",
      claim: "Follows high-value control logic.",
      simTime: actedAt(state, "disposition", "nilpick"),
      stateBefore: "One unit unaccounted for. No evidence pointed at any person.",
      candidateAction: d.steps.length ? `Candidate ${d.steps.map((s) => step[s]).join(", ")}.` : "Took no control action.",
      timingContext: "Closing the case",
      stateAfter: bad.includes("closeStore") ? "Order release was throttled during the build to the peak." : sound >= 2 ? "The store kept trading with the cage under control." : "The cage stayed on normal access.",
      score: Math.min(3, i5) as 0 | 1 | 2 | 3,
      behaviourTags: bad.length || called ? ["unsound_disposition"] : i5 === 3 ? ["loss_controlled"] : ["partial_control"],
      counter: bad.length > 0 || called,
    });

    const targeted = d.controls.filter((c) => c === "scanAtIssue" || c === "exceptionRestow").length;
    const i8 = targeted === 2 ? 3 : targeted === 1 ? 2 : d.controls.length ? 1 : 0;
    const fix: Record<string, string> = {
      scanAtIssue: "item scan required before a high-value bag is sealed",
      exceptionRestow: "exception tote cleared and restowed every hour",
      remindTeam: "a reminder to the team",
      fullAudit: "a full audit, now",
    };
    out.push({
      behaviourId: "I8",
      competencyId: C,
      title: i8 === 3 ? "Put back the two controls that had failed" : i8 === 2 ? "Fixed one of the two controls that failed" : "Did not fix the control that failed",
      claim: "Restores a control that reduces recurrence.",
      simTime: actedAt(state, "disposition", "nilpick"),
      stateBefore: "Two controls had failed: an item scan was skipped at issue, and a cancelled pick was never restowed.",
      candidateAction: d.controls.length ? `Put in place: ${d.controls.map((c) => fix[c]).join("; ")}.` : "Changed nothing.",
      timingContext: "After the investigation",
      stateAfter: targeted === 2 ? "Both routes the stock went missing by are closed." : targeted === 1 ? "One of the two routes is still open." : "Both routes are still open.",
      score: i8 as 0 | 1 | 2 | 3,
      behaviourTags: i8 >= 2 ? ["control_restored"] : ["control_not_restored"],
    });
  }

  /* I6 · nil pick */
  const n = state.nil;
  if (!n.outcome) {
    out.push(notReached("I6", C, "Nil pick", "Investigates Nil Picks before de-listing."));
  } else {
    const i6 = n.outcome === "replenished" ? 3 : n.outcome === "authorised" && n.searchedBefore ? 1 : 0;
    out.push({
      behaviourId: "I6",
      competencyId: C,
      title: i6 === 3 ? "Found the stock before giving up on the line" : n.searchedBefore ? "Looked, then authorised the nil pick anyway" : "Authorised a nil pick without looking",
      claim: "Investigates Nil Picks before de-listing.",
      simTime: when(state, "nilpick"),
      stateBefore: `${form.nilPick.item}: system ${form.nilPick.system}, bin empty. Order ${form.nilPick.order} waiting.`,
      candidateAction: n.searchOwner ? `${n.searchOwner === "me" ? "Searched personally" : `Had ${nameOf(n.searchOwner)} search`}, then ${NIL[n.outcome]}.` : n.viewed.length ? `Checked ${n.viewed.join(", ")}, then ${NIL[n.outcome]}.` : `Without checking any other location, ${NIL[n.outcome]}.`,
      timingContext: "While an order waited",
      stateAfter: n.outcome === "replenished" ? "The crate had come in at 04:30 and was never put away. Bin filled; order shipped complete." : `${form.nilPick.system} units stayed in a crate on the dock. The order went short or the line went off sale.`,
      score: i6 as 0 | 1 | 3,
      behaviourTags: i6 === 3 ? ["nil_pick_investigated"] : ["nil_pick_unverified"],
      counter: !n.searchedBefore && n.outcome !== "replenished",
    });
  }

  /* I7 · uses the team for counts and follow-up */
  if (!reached) {
    out.push(notReached("I7", C, "Using the team on inventory", "Uses team members appropriately for counts and follow-up."));
  } else {
    const countFit = k.countOwner && k.countOwner !== "me" ? taskFit(k.countOwner, "count").fit : 0;
    const recordFit = k.recordsOwner ? taskFit(k.recordsOwner, "records").fit : 0;
    const selfCount = k.countOwner === "me";
    const selfHoard = state.personal.some((p) => p.task === "count" && p.fitAvailable);
    const i7 = countFit >= 0.9 ? 3 : countFit >= 0.6 ? 2 : recordFit >= 0.9 ? 2 : countFit > 0 ? 1 : selfCount ? (selfHoard ? 1 : 2) : 0;
    out.push({
      behaviourId: "I7",
      competencyId: C,
      title: i7 === 3 ? "Gave the count to the person trained for it" : selfCount ? "Did the recount personally" : countFit > 0 ? "Gave the count to somebody not trained for it" : "Did not use the team on the case",
      claim: "Uses team members appropriately for counts and follow-up.",
      simTime: k.openedAt,
      stateBefore: `Farhan is count-trained and cleared for high-value. He was on ${STATION_LABEL[state.assign.farhan ?? "picking"].toLowerCase()}.`,
      candidateAction: `Count: ${k.countOwner ? nameOf(k.countOwner) : "nobody"}. Records: ${k.recordsOwner ? nameOf(k.recordsOwner) : k.viewed.length ? "the manager" : "nobody"}.`,
      timingContext: "During the investigation",
      stateAfter: selfCount ? "The manager was off the floor for five minutes while the surge landed." : countFit >= 0.9 ? "Counted in four minutes while the manager stayed available." : "The count took longer and pulled somebody off work that needed them.",
      score: i7 as 0 | 1 | 2 | 3,
      behaviourTags: i7 === 3 ? ["count_delegated_well"] : selfCount ? ["count_personal"] : ["count_misdelegated"],
    });
  }

  return out;
}

const UNIT_CALL = {
  explained: "explained by the records",
  recovered: "recovered",
  unresolved: "unresolved",
  writeoff: "written off",
  theft: "put down to theft",
};

const NIL = { replenished: "had the crate put away", authorised: "authorised the nil pick", delisted: "took the line off sale", ignored: "left it" };

/* ── Time and priority ────────────────────────────────────────────────── */

function timeEvents(state: HiringState): Draft[] {
  const out: Draft[] = [];
  const form = formFor(state.form);
  const constraint = form.constraint;
  const C: CompetencyId = "timePrioritisation";
  const first = state.constraintActs[0] ?? null;
  const where: Record<string, string> = { case: "during the investigation, as orders first backed up", triage: "when the three problems landed", bottleneck: "once the store was visibly stuck", final: "in the final plan", floor: "in the floor build", absence: "in the floor build" };
  const stage = STAGE_WORD[constraint];

  /* P1 · recognises risk before failure */
  const built = (state.floor?.projected[constraint] ?? 0) >= 0.95;
  const p1 = built || first?.where === "case" ? 3 : first?.where === "triage" ? 2 : first ? 1 : 0;
  // Time ran out before the floor was set, or before the surge had been lived
  // through: there has been nothing yet to get ahead of, or to fall behind.
  const untested = state.expiry !== null && (!state.floor || (!built && !first && state.arrivals.customer === undefined));
  if (untested) out.push(notReached("P1", C, "Anticipation", "Recognises risk before failure."));
  else out.push({
    behaviourId: "P1",
    competencyId: C,
    title: p1 === 3 ? `Strengthened ${stage} before it failed` : p1 === 2 ? `Strengthened ${stage} once the pressure was visible` : p1 === 1 ? `Reinforced ${stage} late` : `Never reinforced ${stage}`,
    claim: "Recognises risk before failure.",
    simTime: first?.at ?? state.floor?.lockedAt ?? null,
    stateBefore: `Inherited ${stage} at ${pct(inheritedFloor(state)[constraint])} of the 06:30 forecast.`,
    candidateAction: built ? `Built it to ${pct(state.floor!.projected[constraint])} in the floor build.` : first ? `Added capacity ${where[first.where] ?? "later"}.` : "Did not add capacity there at any point.",
    timingContext: built ? "Before any queue formed" : first ? at(first.at) : "Never",
    stateAfter: first || built ? "Capacity was in place for part or all of the surge." : "It ran short through the surge.",
    score: p1 as 0 | 1 | 2 | 3,
    behaviourTags: p1 === 3 ? ["anticipatory"] : p1 ? ["reactive"] : ["no_response"],
  });

  /* P2 · acts before an avoidable SLA breach */
  const until = state.expiry ? Math.min(PEAK_AT, state.expiry.clock) : PEAK_AT;
  const breach = state.expiry ? state.expiry.firstBreachAt : state.firstBreachAt;
  const peaked = state.expiry ? state.expiry.maxCtd : state.maxCtd;
  const prePeakMax = Math.max(CTD_TARGET - 1, ...state.trace.filter((t) => t.t < until).map((t) => t.ctd));
  const actedBefore = first !== null && (breach === null || first.at < breach);
  const p2 = breach === null ? 3 : actedBefore || built ? (prePeakMax <= 195 ? 3 : 2) : first ? 1 : 0;
  // Holding the target means something once the surge has arrived.
  if (state.expiry !== null && (!state.floor || (breach === null && state.arrivals.triage === undefined))) {
    out.push(notReached("P2", C, "Acting before a breach", "Acts before avoidable SLA breach."));
  } else out.push({
    behaviourId: "P2",
    competencyId: C,
    title: breach === null ? "Kept click-to-dispatch inside target all shift" : p2 >= 2 ? "Acted before the dispatch target was breached" : first ? "Acted after the dispatch target had gone" : "Let the dispatch target go without acting",
    claim: "Acts before avoidable SLA breach.",
    simTime: first?.at ?? breach,
    stateBefore: `Click-to-dispatch target: ${CTD_TARGET} seconds.`,
    candidateAction: first ? `First reinforced ${stage} at ${at(first.at)}, with CTD at ${first.ctd}s.` : built ? "Had the capacity in place from the floor build." : `Did not reinforce ${stage}.`,
    timingContext: breach === null ? "No breach occurred" : `Target first breached at ${at(breach)}`,
    stateAfter: `CTD peaked at ${peaked}s${state.expiry ? " while the candidate was running the store" : ""}.`,
    score: p2 as 0 | 1 | 2 | 3,
    behaviourTags: breach === null ? ["sla_held"] : p2 >= 2 ? ["acted_before_breach"] : ["acted_after_breach"],
  });

  /* P3 · higher-impact problems first */
  const tri = state.triage;
  if (!tri) {
    out.push(notReached("P3", C, "Three problems, one manager", "Handles higher-impact problems first."));
    out.push(notReached("P6", C, "Manager attention", "Preserves manager attention for manager-level judgement."));
  } else {
    const cover = state.triageAt?.coverage[constraint] ?? 0;
    // Under 95% the queue is growing. Above it, the floor built earlier is holding.
    const real = cover < 0.95;
    const constraintNow = tri.constraint.mode !== "later";
    const aisleNow = tri.aisle.mode !== "later";
    const p3 = real ? (constraintNow ? (aisleNow ? 3 : 2) : aisleNow || tri.followUp.mode !== "later" ? 1 : 0) : aisleNow ? 3 : 2;
    const word = { handle: "took personally", delegate: "delegated", later: "left for after the peak" };
    out.push({
      behaviourId: "P3",
      competencyId: C,
      title: !real
        ? aisleNow ? "Had the aisle cleared; the surge was already covered" : "Left the blocked aisle for later"
        : p3 === 3 ? "Dealt with the two things costing orders, now" : constraintNow ? "Dealt with the main constraint and left the aisle" : "Left the biggest problem for later",
      claim: "Handles higher-impact problems first.",
      simTime: when(state, "triage"),
      stateBefore: `${form.surgeHeadline}: ${stage} at ${pct(cover)} of what it was being asked for; Aisle C blocked by inward crates (routes a third longer); the variance follow-up still open.`,
      candidateAction: `${form.surgeHeadline}: ${word[tri.constraint.mode]}${tri.constraint.owner ? ` to ${nameOf(tri.constraint.owner)}` : ""}. Aisle C: ${word[tri.aisle.mode]}${tri.aisle.owner ? ` to ${nameOf(tri.aisle.owner)}` : ""}. Follow-up: ${word[tri.followUp.mode]}${tri.followUp.owner ? ` to ${nameOf(tri.followUp.owner)}` : ""}.`,
      timingContext: "One personal attention slot available",
      stateAfter: constraintNow ? "The constraint had capacity added within the minute." : "The constraint kept growing through to the next decision.",
      score: p3 as 0 | 1 | 2 | 3,
      behaviourTags: p3 === 3 ? ["impact_first"] : ["impact_missed"],
    });

    /* P6 · preserves manager attention */
    const slotWasted = tri.constraint.mode === "handle" || tri.aisle.mode === "handle" ? 1 : 0;
    const planHands = state.plan
      ? state.tasksOffered.filter((t) => state.plan![t.id]?.bucket === "now" && !t.managerLevel).length
      : 0;
    const misuse = slotWasted + planHands;
    const p6 = misuse === 0 ? 3 : misuse === 1 ? 2 : misuse === 2 ? 1 : 0;
    out.push({
      behaviourId: "P6",
      competencyId: C,
      title: p6 === 3 ? "Kept the manager's attention for manager's work" : "Spent the manager's attention on hands-on work",
      claim: "Preserves manager attention for manager-level judgement.",
      simTime: when(state, "triage"),
      stateBefore: "One personal slot at 06:14, and up to three in the final plan.",
      candidateAction: `${tri.constraint.mode === "handle" ? `Worked the ${STATION_PLACE[constraint]} personally. ` : tri.aisle.mode === "handle" ? "Cleared the aisle personally. " : tri.followUp.mode === "handle" ? "Used the slot on the escalation, which only a manager can sign. " : "Kept the slot free. "}${planHands ? `Took ${planHands} hands-on task${planHands === 1 ? "" : "s"} personally in the final plan.` : "Took no hands-on task personally in the final plan."}`,
      timingContext: "Under peak pressure",
      stateAfter: misuse ? "While doing them, the manager was not available to decide anything else." : "The manager stayed available to decide.",
      score: p6 as 0 | 1 | 2 | 3,
      behaviourTags: p6 === 3 ? ["attention_preserved"] : ["attention_spent_on_tasks"],
    });
  }

  /* P4 and P5 · the final plan */
  const plan = state.plan;
  if (!plan) {
    out.push(notReached("P4", C, "Urgent versus important", "Distinguishes urgent from merely important."));
    out.push(notReached("P5", C, "Deferring safely", "Defers work safely."));
  } else {
    const tasks = state.tasksOffered;
    const rightly = tasks.filter((t) => (plan[t.id]?.bucket !== "later") === t.urgent).length;
    const share = rightly / tasks.length;
    const p4 = share >= 0.85 ? 3 : share >= 0.7 ? 2 : share >= 0.5 ? 1 : 0;
    const peakWork = tasks.filter((t) => !t.urgent && plan[t.id]?.bucket !== "later");
    out.push({
      behaviourId: "P4",
      competencyId: C,
      title: p4 === 3 ? "Kept the peak for what the peak needed" : "Spent the peak on work that could have waited",
      claim: "Distinguishes urgent from merely important.",
      simTime: when(state, "final"),
      stateBefore: `${tasks.length} open tasks at 06:27. ${tasks.filter((t) => t.urgent).length} could not wait for the peak to pass.`,
      candidateAction: peakWork.length ? `Scheduled into the peak: ${peakWork.map((t) => t.title).join("; ")}.` : "Left everything that could wait until after the peak.",
      timingContext: "Three minutes before the peak",
      stateAfter: `${rightly} of ${tasks.length} tasks were timed according to whether they could wait.`,
      score: p4 as 0 | 1 | 2 | 3,
      behaviourTags: p4 === 3 ? ["urgent_important_separated"] : ["urgent_important_confused"],
    });

    const unsafe = tasks.filter((t) => t.urgent && plan[t.id]?.bucket === "later");
    const deferred = tasks.filter((t) => plan[t.id]?.bucket === "later").length;
    const p5 = unsafe.length === 0 ? (deferred > 0 ? 3 : 2) : unsafe.length === 1 ? 1 : 0;
    out.push({
      behaviourId: "P5",
      competencyId: C,
      title: p5 === 3 ? "Deferred only what was safe to defer" : unsafe.length ? "Deferred something that could not wait" : "Deferred nothing, and overloaded the peak",
      claim: "Defers work safely.",
      simTime: when(state, "final"),
      stateBefore: "Not everything could be done. Something had to wait.",
      candidateAction: unsafe.length ? `Left for after the peak: ${unsafe.map((t) => t.title).join("; ")}.` : `Deferred ${deferred} task${deferred === 1 ? "" : "s"}, none of them time-critical.`,
      timingContext: "Locking the shift plan",
      stateAfter: unsafe.length ? "Each of those got worse while it waited." : "Nothing that waited got worse for waiting.",
      score: p5 as 0 | 1 | 2 | 3,
      behaviourTags: p5 === 3 ? ["deferred_safely"] : unsafe.length ? ["unsafe_deferral"] : ["no_deferral"],
    });
  }

  return out;
}

/* ── Critical thinking ────────────────────────────────────────────────── */

/**
 * The panels that show where the store is stuck. When pickers or bins are the
 * problem, the device list shows the cause as plainly as the stage's own
 * numbers do: who the app can send orders to, and who it is taking them from.
 */
const PANELS_OF: Record<Stage, string[]> = {
  picking: ["bnPicking", "bnDevices"],
  putaway: ["bnShelf", "bnDevices"],
  auditing: ["bnDevices"],
  riders: ["bnRiders"],
};

/**
 * Did taking this hand off putaway leave the bins unfilled? A picker gained
 * that way is lost again, and more, to pickers arriving at empty bins.
 */
function starvedBins(state: HiringState, emp: string): boolean {
  const from = state.bn.origins[emp] ?? state.assign[emp];
  if (from !== "putaway") return false;
  const left = state.bn.after?.coverage.putaway ?? (state.bn.coverageAtStart?.putaway ?? 1) - 0.45;
  return left < 0.8;
}

function helps(state: HiringState, move: Intervention, constraint: Stage, aisle: boolean): 1 | 0 | -1 {
  switch (move.kind) {
    case "move": {
      if (move.to === constraint) {
        if (constraint === "picking" && starvedBins(state, move.emp)) return -1;
        return (BY_ID[move.emp]?.skills[move.to] ?? 0) >= 0.6 ? 1 : 0;
      }
      // Taking a hand off the stage that is stuck makes it worse.
      if (state.bn.origins[move.emp] === constraint) return -1;
      // More pickers when the riders are the limit only stacks more bags on the shelf.
      if (constraint === "riders" && move.to === "picking") return -1;
      return 0;
    }
    case "lock": {
      const station = state.assign[move.emp];
      // Opening a device adds a picker in a rush; closing one takes a picker away.
      if (constraint === "picking") return move.locked || starvedBins(state, move.emp) ? -1 : 1;
      // Closing a putaway device keeps a hand on the bins; opening one hands it to the app.
      if (constraint === "putaway") return station === "putaway" ? (move.locked ? 1 : -1) : 0;
      if (constraint === "riders") return move.locked ? 0 : -1;
      return 0;
    }
    case "addSlot":
      return move.station === constraint ? 1 : 0;
    case "riderDesk":
    case "standby":
      return constraint === "riders" ? 1 : 0;
    case "clearAisle":
      return constraint === "picking" && aisle ? 1 : 0;
    case "slowRelease":
      return 0;
  }
}

function criticalEvents(state: HiringState): Draft[] {
  const out: Draft[] = [];
  const b = state.bn;
  const C: CompetencyId = "criticalThinking";

  if (!b.constraintAtStart || !b.coverageAtStart) {
    for (const [id, title, claim] of [
      ["C1", "Inspecting the evidence", "Inspects relevant evidence."],
      ["C2", "Symptom versus constraint", "Separates symptom from constraint."],
      ["C3", "Forming a hypothesis", "Forms a plausible hypothesis."],
      ["C4", "Testing an intervention", "Tests intervention."],
      ["C5", "Checking the result", "Checks whether the intervention worked."],
    ] as const) {
      out.push(notReached(id, C, title, claim));
    }
  } else {
    const constraint = b.constraintAtStart;
    const cover = b.coverageAtStart;
    const said = floorLeadSays(b.blamed, constraint);
    const stage = STAGE_WORD[constraint];
    const sawFirst = PANELS_OF[constraint].some((panel) => b.viewedBeforeAct.includes(panel));
    const acted = b.moves.length > 0;
    const c1 = sawFirst ? 3 : b.viewedBeforeAct.length > 0 ? 2 : b.viewed.length > 0 ? 1 : 0;
    const coverLine = `picking ${pct(cover.picking)}, putaway ${pct(cover.putaway)}, riders ${pct(cover.riders)}`;
    out.push({
      behaviourId: "C1",
      competencyId: C,
      title: c1 === 3 ? "Looked at the floor before accepting the diagnosis" : c1 === 0 ? "Acted on the Floor Lead's word without looking" : "Looked, but not at where the store was stuck",
      claim: "Inspects relevant evidence.",
      simTime: when(state, "bottleneck"),
      stateBefore: `Floor Lead: "${said}" Actual coverage: ${coverLine}.`,
      candidateAction: b.viewedBeforeAct.length ? `Opened ${b.viewedBeforeAct.length} panel${b.viewedBeforeAct.length === 1 ? "" : "s"} before acting${sawFirst ? `, including the one showing ${stage}` : ""}.` : "Opened nothing before acting.",
      timingContext: "Before intervening",
      stateAfter: sawFirst ? "The real constraint was on screen before the decision." : "The decision was made without the constraint's numbers.",
      score: c1 as 0 | 1 | 2 | 3,
      behaviourTags: c1 === 3 ? ["evidence_before_action"] : ["acted_on_assertion"],
    });

    const marks = b.moves.map((m) => helps(state, m, constraint, state.shocks.aisleClearedAt === null));
    const helped = marks.includes(1);
    const hurt = marks.includes(-1);
    const fine = floorHolding(cover);
    const c2 = fine ? (hurt ? 1 : 3) : helped ? (hurt ? 2 : 3) : hurt ? 0 : acted ? 1 : 0;
    out.push({
      behaviourId: "C2",
      competencyId: C,
      title: fine && !hurt ? (acted ? "Reinforced a floor that was already holding" : "Left a floor that was holding alone") : c2 === 3 ? "Fixed the constraint, not the symptom" : hurt ? "Made a change that cost more than it gave" : acted ? "Changed something that was not the constraint" : "Made no intervention",
      claim: "Separates symptom from constraint.",
      simTime: when(state, "bottleneck"),
      stateBefore: fine ? `Floor Lead: "${said}" Every stage was keeping up: ${coverLine}.` : `Orders waiting were climbing. The constraint was ${stage} at ${pct(cover[constraint])}.`,
      candidateAction: acted ? `Candidate ${b.moves.map(describeMove).join("; ")}.` : "Made no change.",
      timingContext: at(when(state, "bottleneck")),
      stateAfter: b.after ? `After three minutes: ${stage} at ${pct(b.after.coverage[constraint])}, ${b.after.ordersWaiting} orders waiting, CTD ${b.after.ctd}s.` : "The system was not run after the change.",
      laterConsequence: helped && b.after ? resilienceOf(state)?.text : undefined,
      score: c2 as 0 | 1 | 2 | 3,
      behaviourTags: fine && !hurt ? ["floor_held"] : c2 === 3 ? ["constraint_targeted"] : hurt ? ["symptom_fed"] : ["constraint_missed"],
      counter: hurt && !helped,
    });

    const names = b.reply === constraint || (b.reply === "aisle" && constraint === "picking");
    // On a floor that is keeping up, the right answer is that nothing is stuck.
    const matches = fine ? b.reply === "holding" : names;
    const c3 = matches ? 3 : fine && names ? 2 : b.reply === "unsure" && b.viewed.length ? 1 : 0;
    const told =
      b.reply === "holding" ? "the floor was holding and to leave it"
        : b.reply === "unsure" ? "they were not sure yet"
          : b.reply === "aisle" ? "the store was stuck at Aisle C"
            : b.reply ? `the store was stuck at ${STAGE_WORD[b.reply as Stage]}` : "";
    out.push({
      behaviourId: "C3",
      competencyId: C,
      title: c3 === 3 ? (fine ? "Told the Floor Lead the floor was holding" : "Named the real constraint to the Floor Lead") : c3 === 2 ? "Named the tightest stage on a floor that was holding" : b.reply ? "Accepted or guessed at the wrong constraint" : "Gave the Floor Lead no diagnosis",
      claim: "Forms a plausible hypothesis.",
      simTime: when(state, "bottleneck"),
      stateBefore: `Floor Lead: "${said}"`,
      candidateAction: b.reply ? `Told him ${told}.` : "Did not answer him.",
      timingContext: "Before or alongside the intervention",
      stateAfter: fine ? `Nothing was stuck. The tightest stage was ${stage} at ${pct(cover[constraint])}.` : `The store was actually stuck at ${stage}.`,
      score: c3 as 0 | 1 | 2 | 3,
      behaviourTags: c3 === 3 ? ["hypothesis_correct"] : ["hypothesis_wrong"],
    });

    // A floor that is already covered is tested by running it as it stands.
    const held = fine && !acted && b.ranAt !== null;
    const c4 = held ? 3 : acted && b.ranAt !== null ? (b.moves.length <= 2 ? 3 : 2) : acted ? 1 : 0;
    out.push({
      behaviourId: "C4",
      competencyId: C,
      title: held ? "Ran the floor as built and confirmed it held" : c4 === 3 ? "Made a targeted change and ran it" : c4 === 2 ? "Changed several things at once" : acted ? "Changed the floor and did not run it" : "Tested nothing",
      claim: "Tests intervention.",
      simTime: b.ranAt,
      stateBefore: "Any change could be run for three minutes to see what it did.",
      candidateAction: acted ? `Made ${b.moves.length} change${b.moves.length === 1 ? "" : "s"}${b.ranAt !== null ? " and ran the system" : " and moved on"}.` : held ? "Made no change, and ran the system to see whether it needed one." : "Made no change.",
      timingContext: "At the bottleneck",
      stateAfter: held ? "Every stage was at or above what it was being asked for." : c4 === 2 ? "With several changes at once, no single one can be credited with the result." : c4 === 3 ? "The effect of the change is attributable." : "No test was run.",
      score: c4 as 0 | 1 | 2 | 3,
      behaviourTags: c4 === 3 ? ["tested_intervention"] : ["untested_change"],
    });

    const c5 = b.effectChecked ? 3 : b.ranAt !== null ? 1 : 0;
    out.push({
      behaviourId: "C5",
      competencyId: C,
      title: c5 === 3 ? "Went back to check the change had worked" : "Did not check whether the change worked",
      claim: "Checks whether the intervention worked.",
      simTime: b.ranAt,
      stateBefore: "The floor's numbers after the run were available.",
      candidateAction: b.effectChecked ? "Opened the floor's numbers after the run." : "Moved on without looking.",
      timingContext: "After the run",
      stateAfter: b.before && b.after ? `CTD ${b.before.ctd}s → ${b.after.ctd}s; orders waiting ${b.before.ordersWaiting} → ${b.after.ordersWaiting}.` : "—",
      score: c5 as 0 | 1 | 3,
      behaviourTags: c5 === 3 ? ["verified_effect"] : ["effect_unverified"],
    });
  }

  /* C6 · investigates with focus */
  const views = state.kase.viewed.length + state.nil.viewed.length + b.viewed.length + state.arjun.checked.length + (state.riya.inspected ? 1 : 0);
  // An investigation counts once it has been closed, one way or another.
  const investigations = [
    { closed: state.kase.stage === "closed" || state.kase.stage === "deferred", blind: state.kase.viewed.length === 0 && !state.kase.recordsOwner },
    { closed: state.nil.outcome !== null, blind: state.nil.viewed.length === 0 && state.nil.searchOwner === null },
    { closed: state.arrivals.customer !== undefined, blind: b.viewed.length === 0 },
  ].filter((entry) => entry.closed);
  const blind = investigations.filter((entry) => entry.blind).length;
  // Behind by three minutes or more at any point, because of time spent looking.
  const late = Object.entries(state.arrivals).some(([scene, at]) => scene !== "outcome" && at - SCHEDULE[scene as SceneId] >= 180);
  const c6 = blind >= 2 ? 0 : views >= 16 || late ? 1 : views >= 13 ? 2 : 3;
  // One investigation is not a pattern.
  if (investigations.length < 2) out.push(notReached("C6", C, "Focused investigation", "Avoids broad, unfocused investigation."));
  else out.push({
    behaviourId: "C6",
    competencyId: C,
    title: c6 === 3 ? "Looked at enough to decide, and no more" : blind >= 2 ? "Decided without evidence in most cases" : "Checked nearly everything before acting",
    claim: "Avoids broad, unfocused investigation.",
    simTime: null,
    stateBefore: "Eighteen sources of evidence were available across the shift.",
    candidateAction: `Opened ${views} of them personally${state.kase.recordsOwner ? ", and had the case records pulled by a colleague" : ""}.`,
    timingContext: late ? "The shift ran behind schedule" : "The shift stayed on schedule",
    stateAfter: blind >= 2 ? `${blind} of ${investigations.length} investigations were decided with nothing opened.` : late ? "Later problems were met minutes after they had started, because of the time spent looking." : "Investigation time did not delay any later decision.",
    score: c6 as 0 | 1 | 2 | 3,
    behaviourTags: c6 === 3 ? ["focused_investigation"] : blind >= 2 ? ["no_investigation"] : ["over_investigation"],
  });

  return out;
}

function describeMove(move: Intervention): string {
  switch (move.kind) {
    case "move":
      return `moved ${nameOf(move.emp)} to ${STATION_LABEL[move.to].toLowerCase()}`;
    case "lock":
      return `${move.locked ? "locked" : "unlocked"} ${nameOf(move.emp)}'s device`;
    case "addSlot":
      return PROCESS_DONE[move.station];
    case "riderDesk":
      return `put ${nameOf(move.emp)} on the rider handover`;
    case "standby":
      return "called in the standby riders";
    case "clearAisle":
      return `had Aisle C cleared${move.owner === "me" ? " personally" : ` by ${nameOf(move.owner)}`}`;
    case "slowRelease":
      return "slowed order release";
  }
}

const PROCESS_DONE: Record<Stage, string> = {
  picking: "had Aisle C cleared",
  putaway: "put fast lines away first",
  auditing: "paused the cycle count",
  riders: "batched riders by lane",
};

/** The cross-scenario story: did the team built earlier absorb the move made later? */
function resilienceOf(state: HiringState): { text: string; held: boolean } | undefined {
  const moved = state.bn.moves.find((m): m is Extract<Intervention, { kind: "move" }> => m.kind === "move");
  const after = state.bn.after;
  if (!moved || !after) return undefined;
  // The work that gave somebody up is the work that has to absorb it.
  const from = state.bn.origins[moved.emp];
  if (!from || from === moved.to) return undefined;

  const left = after.coverage[from];
  const held = left >= 0.9;
  const name = nameOf(moved.emp);
  const place = STATION_LABEL[from].toLowerCase();
  const destination = STATION_LABEL[moved.to].toLowerCase();

  if (from !== "putaway") {
    return {
      held,
      text: held
        ? `Moving ${name} to ${destination} took a hand from ${place}, which still stood at ${pct(left)} afterwards.`
        : `Moving ${name} to ${destination} took a hand from ${place}, which fell to ${pct(left)}.`,
    };
  }

  // Putaway absorbs a lost hand as well as its newest member was looked after.
  const developed = (state.riya.choices ?? []).some((c) => c === "lockPutaway" || c === "pair");
  if (held) {
    return {
      held,
      text: developed
        ? `Moving ${name} to ${destination} cost putaway a hand; with Riya kept on putaway earlier, it still held at ${pct(left)}.`
        : `Putaway held at ${pct(left)} after ${name} moved to ${destination}.`,
    };
  }
  return {
    held,
    text: developed
      ? `Putaway fell to ${pct(left)} after ${name} moved to ${destination}, even with Riya on it.`
      : `Putaway fell to ${pct(left)} after ${name} moved to ${destination}. Riya, with her device still open to orders, could not absorb it.`,
  };
}

/* ── Customer-first ───────────────────────────────────────────────────── */

function customerEvents(state: HiringState): Draft[] {
  const out: Draft[] = [];
  const form = formFor(state.form);
  const C: CompetencyId = "customerFirst";

  /* U1 · protects safety */
  const bag = state.bag;
  if (!bag) {
    out.push(notReached("U1", C, "Product safety", "Protects product safety and quality."));
  } else {
    const untouched = bag.by === "unchanged";
    const u1 = untouched ? 0 : bag.cleanerBag === 2 ? 3 : bag.cleanerLiner ? 2 : 0;
    out.push({
      behaviourId: "U1",
      competencyId: C,
      title: u1 === 3 ? "Separated a chemical from open food before it left" : u1 === 2 ? "Lined the chemical but left it in the food bag" : "Let a chemical go out in a bag with open food",
      claim: "Protects product safety and quality.",
      simTime: bag.at,
      stateBefore: `Staging shelf: toilet cleaner, loose coriander and apples packed in one bag. CTD ${bag.ctdBefore}s against a ${CTD_TARGET}s target.`,
      candidateAction: untouched ? "Dispatched it unchanged." : `${bag.by === "me" ? "Repacked it personally" : `Had ${nameOf(bag.by)} repack it`}: cleaner ${bag.cleanerBag === 2 ? "in its own bag" : bag.cleanerLiner ? "lined, same bag" : "left in the same bag"}.`,
      timingContext: "With the order at the edge of target",
      stateAfter: untouched ? `Dispatched at ${bag.ctdBefore}s, unsegregated.` : `Dispatched at ${bag.ctdAfter}s, ${bag.cleanerBag === 2 ? "segregated" : "partly protected"}.`,
      score: u1 as 0 | 2 | 3,
      behaviourTags: u1 === 3 ? ["segregated"] : u1 === 2 ? ["partial_segregation"] : ["segregation_breach"],
      counter: u1 === 0,
    });
  }

  /* U2 · accepts a justified operational cost */
  const n = state.nil.outcome;
  if (!n) {
    out.push(notReached("U2", C, "Accepting justified cost", "Accepts justified operational cost where necessary."));
  } else {
    const effort = state.nil.searchedBefore;
    const u2 = n === "replenished" ? 3 : effort ? 2 : 0;
    out.push({
      behaviourId: "U2",
      competencyId: C,
      title: u2 === 3 ? "Spent the minutes it took to send a complete order" : effort ? "Spent the effort, and still sent the order short" : "Took the quick option and sent the order short",
      claim: "Accepts justified operational cost where necessary.",
      simTime: when(state, "nilpick"),
      stateBefore: `Order ${form.nilPick.order} was waiting on ${form.nilPick.item}. Authorising a nil pick would have cleared it in seconds.`,
      candidateAction: effort ? "Had the store searched before deciding." : "Did not search.",
      timingContext: "With the queue building",
      stateAfter: n === "replenished" ? "The customer received the whole order." : "The customer received a refund for the line instead of the item.",
      score: u2 as 0 | 2 | 3,
      behaviourTags: u2 === 3 ? ["cost_accepted_for_customer"] : ["speed_over_completeness"],
    });
  }

  /* U3 · does not buy an internal metric with the customer */
  // The bag and the nil pick are scored by U1 and U2. Counting them here as
  // well would score one decision twice inside the same competency, so this
  // reads only the two other moments a number could be bought at a customer's
  // expense: stopping the store to search, and holding orders back.
  const trades: string[] = [];
  if (state.bn.moves.some((m) => m.kind === "slowRelease")) trades.push("slowed order release, which lengthens every customer's promise");
  if (state.kase.disposition?.steps.includes("closeStore")) trades.push("stopped order release to search for one unit");
  const reachedAll = state.arrivals.customer !== undefined;
  if (!reachedAll && trades.length === 0) {
    out.push(notReached("U3", C, "Metrics versus the customer", "Does not optimise internal metrics at customer expense."));
  } else {
    const u3 = trades.length === 0 ? 3 : trades.length === 1 ? 1 : 0;
    out.push({
      behaviourId: "U3",
      competencyId: C,
      title: u3 === 3 ? "Never bought a metric with a customer's order" : "Protected a number at a customer's expense",
      claim: "Does not optimise internal metrics at customer expense.",
      simTime: null,
      stateBefore: "Twice in the shift, holding customers' orders back would have made the store's own numbers easier: stopping order release to search for a missing unit, and slowing release at the bottleneck.",
      candidateAction: trades.length ? `Candidate ${trades.join("; ")}.` : "Took none of them.",
      timingContext: "Across the shift",
      stateAfter: `${trades.length} of 2 taken.`,
      score: u3 as 0 | 1 | 3,
      behaviourTags: u3 === 3 ? ["customer_over_metric"] : ["metric_over_customer"],
      counter: trades.length >= 2,
    });
  }

  /* U4 · proportionate recovery */
  const entry = state.plan?.lateOrder;
  if (!state.plan) {
    out.push(notReached("U4", C, "Proportionate recovery", "Uses proportionate recovery."));
  } else {
    const fix = entry?.bucket === "later" ? null : entry?.fix ?? "informPriority";
    const u4 = fix === "informPriority" ? 3 : fix ? 1 : 0;
    const said: Record<string, string> = {
      informPriority: "told the customer now, with a real time, and put the order on a priority rider",
      voucher: "issued a ₹200 voucher without telling the customer about the delay",
      cancel: "cancelled and refunded the order",
    };
    out.push({
      behaviourId: "U4",
      competencyId: C,
      title: u4 === 3 ? "Told a customer about a delay before they found out" : fix ? "Compensated instead of fixing" : "Let a customer discover the delay themselves",
      claim: "Uses proportionate recovery.",
      simTime: when(state, "final"),
      stateBefore: "Order #5521 was going to miss its promise by a few minutes. The customer did not know.",
      candidateAction: fix ? `Candidate ${said[fix]}${entry?.owner ? ` (through ${nameOf(entry.owner)})` : ""}.` : "Left it for after the peak.",
      timingContext: "In the final plan",
      stateAfter: fix === "informPriority" ? "The customer got the order a few minutes late and knew why." : fix === "cancel" ? "The customer got no order." : fix ? "The customer got a late order and a voucher, and no explanation." : "The order arrived late with no word.",
      score: u4 as 0 | 1 | 3,
      behaviourTags: u4 === 3 ? ["proportionate_recovery"] : fix ? ["disproportionate_recovery"] : ["no_recovery"],
    });
  }

  return out;
}

/* ── Flags, profile, result ───────────────────────────────────────────── */

export interface ControlFlag {
  id: string;
  title: string;
  detail: string;
}

function controlFlags(state: HiringState): ControlFlag[] {
  const flags: ControlFlag[] = [];
  const form = formFor(state.form);
  const d = state.kase.disposition;

  if (state.bag && (state.bag.by === "unchanged" || (state.bag.cleanerBag === 1 && !state.bag.cleanerLiner))) {
    flags.push({ id: "segregation", title: "Food / chemical segregation breach", detail: "A toilet cleaner was dispatched in the same bag as loose produce." });
  }
  if (d && (d.steps.includes("writeOff") || d.units.includes("writeoff"))) {
    flags.push({ id: "writeoff", title: "High-value write-off without verification", detail: `A ${form.highValue.item} unit was written off while still unexplained.` });
  }
  if (d && (d.steps.includes("accuse") || d.units.includes("theft"))) {
    flags.push({ id: "accusation", title: "Unsupported theft accusation", detail: "An associate was named as responsible. Nothing in the records identified a person." });
  }
  if ((state.nil.outcome === "authorised" || state.nil.outcome === "delisted") && !state.nil.searchedBefore) {
    flags.push({ id: "nilpick", title: "Nil Pick without reasonable verification", detail: `${form.nilPick.item} was ${state.nil.outcome === "delisted" ? "taken off sale" : "nil-picked"} with no other location checked. The stock was in a crate on the inward dock.` });
  }
  const bare = (state.floor?.uncovered ?? []).filter((s) => s !== "auditing");
  if (bare.length) {
    flags.push({ id: "uncovered", title: "Critical workflow left uncovered", detail: `Nobody was assigned to ${bare.map((s) => STATION_LABEL[s]).join(", ")} when the floor was set.` });
  }
  // Fresh lines went into the breakfast rush unchecked on a floor this candidate set.
  if (state.floor && state.outcome && !(state.audit.doneAt !== null && state.audit.doneAt <= PEAK_AT)) {
    flags.push({ id: "perishables", title: "Perishables check not completed before the rush", detail: "Milk, bread, eggs and produce went on sale for the breakfast peak before the morning date and quality check was finished." });
  }
  const controlled = d?.steps.includes("controlAccess") ?? false;
  if (state.plan && state.plan.variance?.bucket === "later" && !controlled) {
    flags.push({ id: "disposition", title: "Unsafe inventory disposition", detail: "The high-value variance was left through the peak with the cage on normal access." });
  }
  return flags;
}

export type EvidenceStrength = "STRONG EVIDENCE" | "MODERATE EVIDENCE" | "LIMITED EVIDENCE";

export interface CompetencyResult {
  id: CompetencyId;
  label: string;
  weight: number;
  /** The average of its decisions' scores. */
  score: number;
  /** Decisions reached, of those the competency is built from. */
  decisions: number;
  decisionsTotal: number;
  /** Raw behaviour points, for reference. The score is not this ratio. */
  earned: number;
  available: number;
  strength: EvidenceStrength;
  observed: number;
  opportunities: number;
}

export interface AssessmentResult {
  version: string;
  form: string;
  overall: number;
  /** The plan was never locked: time ran out, or the candidate left. */
  incomplete: boolean;
  /** Moments the candidate actually reached, of the thirty-four. */
  observed: number;
  opportunities: number;
  competencies: CompetencyResult[];
  /** One per decision. Competency scores are averages of these. */
  decisions: DecisionResult[];
  evidence: EvidenceEvent[];
  flags: ControlFlag[];
  indication: string;
  /** `observed` is false where none of the subscore's moments were reached. */
  teamSubscores: { id: string; label: string; score: number; observed: boolean; note?: string }[];
  teamEffect: { label: string; value: string }[];
  crossScenario: { title: string; rating: string; text: string }[];
  probes: { area: string; evidence: string; probe: string }[];
  signature: { name: string; blurb: string };
  outcomeTitle: string;
  candidate: {
    strongest: { title: string; text: string }[];
    development: { label: string; text: string };
    recommendations: string[];
  };
  stats: { delegated: number; delegatedWell: number; personalDelegable: number; maxCtd: number; finalCtd: number | null; trust: number; cost: number };
}

/** The scene each behaviour is decided in. The rest are read from the whole shift. */
const DECIDED_IN: Record<string, SceneId> = {
  T1: "floor", T2: "floor", T4: "floor", T3: "absence",
  T5: "riya", T6: "riya", T7: "arjun", T8: "arjun",
  I1: "case", I2: "case", I3: "case", I4: "case", I5: "case", I7: "case", I8: "case",
  I6: "nilpick", U2: "nilpick",
  P3: "triage", P6: "triage",
  C1: "bottleneck", C2: "bottleneck", C3: "bottleneck", C4: "bottleneck", C5: "bottleneck",
  U1: "customer",
  P4: "final", P5: "final", U4: "final",
};

/**
 * The clock ran out in the middle of something.
 *
 * Whatever the candidate had already done in that scene stands. What they had
 * not got to yet is not a decision to do nothing — the time ended — so a zero
 * for inaction there becomes "not reached". A zero earned by doing something
 * (an accusation, a write-off) is kept: that was a decision.
 */
function cutShort(state: HiringState, draft: Draft): Draft {
  if (!state.expiry || draft.missed || draft.counter || draft.score !== 0) return draft;
  if (DECIDED_IN[draft.behaviourId] !== state.expiry.scene) return draft;
  // Answering the Floor Lead wrongly, or changing the floor without looking, was done — not left undone.
  if (draft.behaviourId === "C3" && state.bn.reply !== null) return draft;
  if (draft.behaviourId === "C1" && state.bn.moves.length > 0) return draft;
  return notReached(draft.behaviourId, draft.competencyId, draft.title, draft.claim);
}

/** Did the candidate get as far as this moment? */
function reached(event: EvidenceEvent): boolean {
  return !event.behaviourTags.includes("not_reached");
}

/**
 * The decisions the behaviours come out of.
 *
 * Several behaviours are read from one decision: closing the case is scored
 * for how the units were classified, what was done about the unresolved one
 * and which control was restored — three behaviours, one moment of judgement.
 * Summing them as three would let that one moment count three times, and a
 * candidate who got it wrong would look three times worse than one who got a
 * single-behaviour decision wrong.
 *
 * So behaviours are grouped by the decision they come from, each decision is
 * scored once (the share of its behaviours' points earned), and a competency
 * is the plain average of its decisions. Every behaviour is in exactly one.
 */
export const DECISIONS: { id: string; competencyId: CompetencyId; label: string; behaviours: string[] }[] = [
  { id: "floor", competencyId: "teamManagement", label: "Building the floor", behaviours: ["T1", "T2"] },
  { id: "gap", competencyId: "teamManagement", label: "Covering the absence", behaviours: ["T3", "T4"] },
  { id: "riya", competencyId: "teamManagement", label: "A new joiner on orders", behaviours: ["T5", "T6"] },
  { id: "arjun", competencyId: "teamManagement", label: "An unhappy expert", behaviours: ["T7", "T8"] },
  { id: "delegation", competencyId: "teamManagement", label: "Who did the work", behaviours: ["T9", "T10"] },

  { id: "count", competencyId: "inventoryManagement", label: "Counting the cage", behaviours: ["I1", "I2", "I7"] },
  { id: "records", competencyId: "inventoryManagement", label: "Reading the records", behaviours: ["I3"] },
  { id: "disposition", competencyId: "inventoryManagement", label: "Closing the case", behaviours: ["I4", "I5", "I8"] },
  { id: "nilpick", competencyId: "inventoryManagement", label: "The nil pick", behaviours: ["I6"] },

  { id: "surge", competencyId: "timePrioritisation", label: "Getting ahead of the surge", behaviours: ["P1", "P2"] },
  { id: "triage", competencyId: "timePrioritisation", label: "Three problems, one manager", behaviours: ["P3"] },
  { id: "attention", competencyId: "timePrioritisation", label: "The manager's own time", behaviours: ["P6"] },
  { id: "plan", competencyId: "timePrioritisation", label: "The final plan", behaviours: ["P4", "P5"] },

  { id: "diagnosis", competencyId: "criticalThinking", label: "Reading the bottleneck", behaviours: ["C1", "C3"] },
  { id: "intervention", competencyId: "criticalThinking", label: "Changing the floor", behaviours: ["C2"] },
  { id: "verification", competencyId: "criticalThinking", label: "Testing the change", behaviours: ["C4", "C5"] },
  { id: "focus", competencyId: "criticalThinking", label: "How much was looked at", behaviours: ["C6"] },

  { id: "bag", competencyId: "customerFirst", label: "The bag at staging", behaviours: ["U1"] },
  { id: "complete", competencyId: "customerFirst", label: "A complete order", behaviours: ["U2"] },
  { id: "trades", competencyId: "customerFirst", label: "Numbers versus the customer", behaviours: ["U3"] },
  { id: "recovery", competencyId: "customerFirst", label: "A late order", behaviours: ["U4"] },
];

export interface DecisionResult {
  id: string;
  competencyId: CompetencyId;
  label: string;
  behaviours: string[];
  /** False where none of its behaviours was reached. */
  observed: boolean;
  /** 0–100: points earned over points available, across the behaviours reached. */
  score: number;
  earned: number;
  available: number;
}

/** How much the decisions seen support a competency score: how many, how complete, how consistent. */
function strengthOf(decisions: DecisionResult[]): EvidenceStrength {
  const seen = decisions.filter((d) => d.observed).map((d) => (d.earned / d.available) * 3);
  const share = seen.length / decisions.length;
  const mean = seen.reduce((s, v) => s + v, 0) / (seen.length || 1);
  const spread = Math.sqrt(seen.reduce((s, v) => s + (v - mean) ** 2, 0) / (seen.length || 1));
  return seen.length >= 4 && share >= 0.85 && spread <= 0.75
    ? "STRONG EVIDENCE"
    : seen.length >= 3 && share >= 0.6
      ? "MODERATE EVIDENCE"
      : "LIMITED EVIDENCE";
}

const PROBES: Record<string, { area: string; probe: string }> = {
  T1: { area: "Workforce planning", probe: "Talk me through how you decide where people stand before a peak. What do you look at first?" },
  T3: { area: "Workforce planning", probe: "Tell me about a shift you started short-staffed. What did you do in the first ten minutes, and what did it cost?" },
  T4: { area: "Team resilience", probe: "When your whole team is busy, how do you make sure somebody can still be moved if something breaks?" },
  T5: { area: "Performance coaching", probe: "Describe a time someone on your team was slow. How did you find out why before deciding what to do?" },
  T6: { area: "Performance coaching", probe: "Tell me about a new starter you nearly gave up on. What changed?" },
  T7: { area: "Conflict & trust", probe: "Tell me about a time an associate raised a grievance at the worst possible moment. Where did you have the conversation, and why there?" },
  T8: { area: "Conflict & trust", probe: "Have you ever promised a team member something that turned out not to be yours to promise? What happened next?" },
  T9: { area: "Delegation", probe: "Tell me about a situation where you had to decide which problems to handle yourself and which to hand to somebody. How did you choose the person?" },
  T10: { area: "Delegation", probe: "When the store is under pressure, what do you personally stop doing? Give me an example." },
  I2: { area: "Inventory investigation", probe: "The system count and what is in the bin disagree. What is the first thing you do, and why that before anything else?" },
  I3: { area: "Inventory investigation", probe: "Walk me through how you would trace a missing high-value unit. Which records, in what order?" },
  I5: { area: "Loss control", probe: "You have one unit you cannot explain and no evidence about who. What do you do, and what do you not do?" },
  I6: { area: "Nil picks", probe: "A picker reports a nil pick on a fast line the system says is in stock. What happens in the next two minutes?" },
  I8: { area: "Loss control", probe: "After you find how stock went missing, how do you make sure it does not happen the same way next week?" },
  P1: { area: "Anticipation", probe: "Tell me about a time you saw a problem coming on the floor before the numbers showed it. What tipped you off?" },
  P3: { area: "Prioritisation", probe: "Three things go wrong at once and you can only be in one place. How do you decide?" },
  P4: { area: "Prioritisation", probe: "Give me an example of something important you deliberately left until after a peak. How did you know it was safe to?" },
  P5: { area: "Prioritisation", probe: "Tell me about something you postponed that you should not have. What did it cost?" },
  P6: { area: "Manager attention", probe: "Describe the last time you ended up doing a job on the floor yourself. Looking back, should you have?" },
  C1: { area: "Diagnosis", probe: "Your floor lead tells you what the problem is. When do you take their word, and when do you go and look?" },
  C2: { area: "Diagnosis", probe: "Orders are backing up. How do you tell which stage is actually the bottleneck?" },
  C5: { area: "Diagnosis", probe: "After you change something on the floor, how do you find out whether it worked?" },
  C6: { area: "Decisiveness", probe: "How do you know when you have enough information to act? Tell me about a time you waited too long." },
  U1: { area: "Product safety", probe: "An order is about to miss its dispatch target and the bag is packed wrongly. What do you do?" },
  U2: { area: "Customer outcome", probe: "When is it right to let an order go late or cost more in order to get it right?" },
  U3: { area: "Customer outcome", probe: "Tell me about a time a target and a customer's interest pulled in different directions. Which won?" },
  U4: { area: "Service recovery", probe: "An order is going to be late and the customer does not know yet. What do you do, and what would be too much?" },
};

const RECOMMENDATIONS: Record<string, string> = {
  T1: "Before a peak, read the forecast against picking, putaway and riders, not only picking. The one nobody is watching is the one that fails.",
  T3: "Decide the staffing gap in the first five minutes. Agency cover, a reallocation and an extension are all cheaper at 06:00 than at 06:25.",
  T4: "Leave a device or two unlocked where the work can spare them. A reserve you never use costs less than a rush you cannot staff.",
  T5: "When someone is slow, open their record before deciding. Where the seconds go usually tells you why.",
  T6: "Fix the cause and plan the next step. Removing a new joiner solves this morning and guarantees the same problem with the next one.",
  T7: "Take grievances off the floor. Two minutes away from the line costs less than the line listening.",
  T8: "Say only what you have verified, and say what you will check. A promise you cannot keep costs more than an honest \"I don't know yet\".",
  T9: "Before you do a task, ask who on the floor is trained for it. Hand it to that person, not the nearest one.",
  T10: "When you catch yourself counting, searching or packing, stop and hand it over. Your job in a peak is to be available to decide.",
  I2: "Count first. Until the physical number is known, every theory about a variance is a guess.",
  I3: "Follow the unit: orders, then the scan log, then the exception area. Most missing stock is a missed scan or an unreturned pick.",
  I4: "Keep explained, recovered and unresolved apart. They need three different actions and one number hides all of them.",
  I5: "With an unexplained unit: preserve the evidence, control access, escalate, keep trading. Never name a person without proof.",
  I6: "Check overstock and the inward dock before authorising a nil pick. The system is usually right that the stock is in the building.",
  I8: "Close the case by closing the gap that caused it. Name the specific control, not a general reminder.",
  P1: "Act on the forecast, not the queue. By the time the queue shows it, the cheap fix has gone.",
  P3: "Rank simultaneous problems by orders affected per minute, then give your own attention to the one only you can decide.",
  P4: "In a peak, do only what cannot wait. Audits and coaching are important and belong after it.",
  P5: "Check each thing you defer: does it get worse while it waits? If yes, it is not deferrable.",
  P6: "Use your own attention for judgement, people and escalation. Hands-on work belongs to somebody trained for it.",
  C1: "Check the floor's own numbers — pickers, bins, riders, devices — before accepting a diagnosis, including from someone you trust.",
  C2: "Find the stage with the least capacity against its demand: pickers, bins or riders. More hands anywhere else only moves the pile.",
  C4: "Change one thing, run it, read the result. Several changes at once teach you nothing.",
  C5: "Go back and look. An intervention you did not check is a hope, not a fix.",
  C6: "Look until you can decide, then decide. More checking after that point is a cost with no return.",
  U1: "Segregation is not negotiable against a dispatch target. Repack, take the seconds, send it safe.",
  U2: "A complete order two minutes later beats a short order on time.",
  U3: "When a number and a customer conflict, ask which one the customer would choose.",
  U4: "Tell the customer early and fix the delivery. Compensation without information is not recovery.",
};

const STANDING_ADVICE: Record<CompetencyId, string[]> = {
  teamManagement: [RECOMMENDATIONS.T9!, RECOMMENDATIONS.T4!, RECOMMENDATIONS.T5!],
  inventoryManagement: [RECOMMENDATIONS.I2!, RECOMMENDATIONS.I8!, RECOMMENDATIONS.I6!],
  timePrioritisation: [RECOMMENDATIONS.P1!, RECOMMENDATIONS.P3!, RECOMMENDATIONS.P5!],
  criticalThinking: [RECOMMENDATIONS.C1!, RECOMMENDATIONS.C5!, RECOMMENDATIONS.C4!],
  customerFirst: [RECOMMENDATIONS.U3!, RECOMMENDATIONS.U4!, RECOMMENDATIONS.U2!],
};

function signatureOf(score: Record<CompetencyId, number>, events: EvidenceEvent[], overall: number): { name: string; blurb: string } {
  const get = (id: string) => events.find((e) => e.behaviourId === id)?.score ?? 0;
  const seen = events.filter((e) => !e.behaviourTags.includes("not_reached")).length;
  if (seen < events.length / 2) {
    return { name: "SHIFT NOT COMPLETED", blurb: "Too little of the shift was played to describe how this person decides." };
  }
  const anticipated = get("P1") === 3;
  const others = Math.min(score.inventoryManagement, score.timePrioritisation, score.criticalThinking);
  if (overall >= 55 && get("T10") === 0 && get("T9") <= 1) {
    return { name: "STRONG OPERATOR · WEAK DELEGATOR", blurb: "Makes sound calls and makes most of them personally. The shift worked because they were in it." };
  }
  if (others >= 60 && get("T7") + get("T8") <= 1 && get("T6") <= 1) {
    return { name: "HARD DRIVER · TRUST RISK", blurb: "Reads the operation well and gets it done by pressure. The floor did what it was told and stopped offering anything more." };
  }
  if (overall >= 78 && anticipated && score.teamManagement >= 75) {
    return { name: "BALANCED FLOOR LEADER", blurb: "Built the team early, ran the store through it, and kept the customer in view when the numbers argued otherwise." };
  }
  // Getting ahead of the surge only reads as anticipation if the target then held.
  if (overall >= 68 && anticipated && get("P2") === 3) {
    return { name: "ANTICIPATORY SHIFT LEADER", blurb: "Moves on the forecast rather than the queue. Problems tended to arrive already half-solved." };
  }
  if (score.criticalThinking >= 60 && score.inventoryManagement >= 60 && score.timePrioritisation < 60) {
    return { name: "METHODICAL OPERATOR", blurb: "Thorough with evidence and careful with stock. Decisions came after the floor needed them." };
  }
  if (score.timePrioritisation >= 55 && (score.inventoryManagement < 50 || score.criticalThinking < 50)) {
    return { name: "FAST MOVER · CONTROL RISK", blurb: "Quick to act and comfortable with pressure. Acts ahead of the evidence, and controls get skipped on the way." };
  }
  return { name: "REACTIVE STABILISER", blurb: "Responds once a problem is visible and usually steadies it. Rarely gets ahead of one." };
}

export function scoreAssessment(state: HiringState): AssessmentResult {
  const evidence = [
    ...teamEvents(state),
    ...inventoryEvents(state),
    ...timeEvents(state),
    ...criticalEvents(state),
    ...customerEvents(state),
  ]
    .map((draft) => cutShort(state, draft))
    .map(typed);

  const byCompetency = Object.fromEntries(
    COMPETENCIES.map((id) => [id, evidence.filter((e) => e.competencyId === id)]),
  ) as Record<CompetencyId, EvidenceEvent[]>;

  // A competency is scored on the moments the candidate reached. One they never
  // got to says nothing about them, and scoring it as zero would say something.
  const byId = new Map(evidence.map((event) => [event.behaviourId, event]));
  const decisions: DecisionResult[] = DECISIONS.map((decision) => {
    const seen = decision.behaviours.map((id) => byId.get(id)!).filter(reached);
    const earned = seen.reduce((sum, e) => sum + e.score, 0);
    const available = seen.length * 3;
    return { ...decision, observed: seen.length > 0, score: available ? Math.round((earned / available) * 100) : 0, earned, available };
  });

  // Each decision counts once, however many behaviours were read from it.
  const competencies: CompetencyResult[] = COMPETENCIES.map((id) => {
    const events = byCompetency[id];
    const seen = events.filter(reached);
    const own = decisions.filter((d) => d.competencyId === id);
    const made = own.filter((d) => d.observed);
    return {
      id,
      label: COMPETENCY_LABEL[id],
      weight: assessmentWeights[id],
      score: made.length ? Math.round((made.reduce((sum, d) => sum + d.earned / d.available, 0) / made.length) * 100) : 0,
      decisions: made.length,
      decisionsTotal: own.length,
      earned: seen.reduce((sum, e) => sum + e.score, 0),
      available: seen.length * 3,
      strength: strengthOf(own),
      observed: seen.length,
      opportunities: events.length,
    };
  });

  const incomplete = state.plan === null;
  const observed = evidence.filter(reached).length;
  const opportunities = evidence.length;

  // Each competency counts by its weight times the share of it that was seen.
  // On a finished shift that is exactly Team × 0.30 + Inventory × 0.25 + …;
  // on an unfinished one, a competency seen once cannot carry a tenth of the
  // result on that one moment.
  const seenWeight = competencies.reduce((sum, c) => sum + c.weight * (c.decisions / c.decisionsTotal), 0);
  const overall = seenWeight
    ? Math.round(competencies.reduce((sum, c) => sum + c.score * c.weight * (c.decisions / c.decisionsTotal), 0) / seenWeight)
    : 0;

  // Where something downstream needs a number for every competency, an
  // unobserved one borrows the overall rather than reading as a zero.
  const scoreMap = Object.fromEntries(competencies.map((c) => [c.id, c.observed ? c.score : overall])) as Record<CompetencyId, number>;

  const flags = controlFlags(state);
  const get = (id: string) => evidence.find((e) => e.behaviourId === id)!;
  const sub = (label: string, id: string, ids: string[]) => {
    const events = ids.map(get).filter(reached);
    return {
      id,
      label,
      observed: events.length > 0,
      score: events.length ? Math.round((events.reduce((s, e) => s + e.score, 0) / (events.length * 3)) * 100) : 0,
    };
  };

  const hoarded = state.personal.filter((p) => p.delegable && p.fitAvailable).length;
  const well = state.delegations.filter((d) => d.appropriate).length;
  const developed = (state.riya.choices ?? []).some((c) => c === "lockPutaway" || c === "pair");
  const peopleOpen = [
    state.riya.choices?.includes("warn") ? "Riya (warned)" : null,
    state.riya.choices?.includes("returnAgency") ? "Riya (sent back to the agency)" : null,
    state.riya.choices?.includes("target") ? "Riya (on orders with a target)" : null,
    state.riya.choices && state.assign.riya === "putaway" && !isLocked(state, "riya") ? "Riya (device still open to orders)" : null,
    state.arjun.outcome === "resentful" ? "Arjun (resentful)" : null,
    state.arjun.unsupportedPromise ? "Arjun (promised a payment date)" : null,
  ].filter((v): v is string => v !== null);

  const resilience = Math.round(((get("T4").score + (state.outcome ? (state.outcome.pickingAtPeak >= 0.9 ? 3 : state.outcome.pickingAtPeak >= 0.8 ? 2 : 1) : 0)) / 6) * 100);

  const teamSubscores = [
    sub("Workforce planning", "planning", ["T1", "T3"]),
    sub("Skill-to-role matching", "matching", ["T2"]),
    sub("Performance coaching", "coaching", ["T5", "T6"]),
    sub("Conflict & trust", "trust", ["T7", "T8"]),
    sub("Delegation", "delegation", ["T9"]),
    { id: "resilience", label: "Team resilience", score: resilience, observed: reached(get("T4")) },
    { ...sub("Manager dependency", "dependency", ["T10"]), note: hoarded <= 1 ? "Low" : hoarded <= 3 ? "Moderate" : "High" },
  ];

  const teamEffect = [
    { label: "Peak coverage · picking and riders", value: state.outcome ? pct(state.outcome.peakCoverage) : "—" },
    { label: "Delegation", value: `${well} / ${state.delegations.length + hoarded} appropriate` },
    { label: "Flexible capacity preserved", value: (state.floor?.reserve.length ?? 0) > 0 ? "Yes" : "No" },
    { label: "Manager dependency", value: hoarded <= 1 ? "Low" : hoarded <= 3 ? "Moderate" : "High" },
    { label: "Team trust", value: state.trust >= 68 ? "Rose" : state.trust <= 54 ? "Fell" : "Held" },
    { label: "Employee improvement", value: developed && (state.outcome?.riyaOutput ?? 0) >= 0.8 ? "Riya: 55% → " + pct(state.outcome!.riyaOutput) : "None" },
    { label: "People issues unresolved at peak", value: String(peopleOpen.length) },
  ];

  /* Cross-scenario evidence: the part no single decision shows. */
  const crossScenario: AssessmentResult["crossScenario"] = [];
  const line = resilienceOf(state);
  if (line) {
    crossScenario.push({ title: "Team resilience", rating: line.held ? "Strong" : "Exposed", text: line.text });
  } else if (state.riya.choices && state.outcome) {
    const out = state.outcome.riyaOutput;
    const picking = state.outcome.pickingAtPeak;
    crossScenario.push({
      title: "A new joiner, by the peak",
      rating: out >= 0.8 ? "Strong" : out > 0 ? "Mixed" : "Exposed",
      text:
        out >= 0.8
          ? `Riya was kept on putaway at 06:02 and shown the bins, rather than pressed or removed. By 06:40 she was putting away at ${pct(out)} of a trained hand, with picking at ${pct(picking)} at the peak.`
          : out > 0
            ? `Riya's device was locked to putaway at 06:02. By 06:40 she was at ${pct(out)} of a trained hand, with picking at ${pct(picking)} at the peak.`
            : state.assign.riya === undefined
              ? "Riya was sent back to the agency at 06:02. Putaway went into the peak a hand short."
              : state.riya.leftAt !== null
                ? "Riya was held to the pick target on her second day. She did not come back from her break, and the agency says she is not returning."
                : `Riya's device was left open to orders at 06:02. Through the peak the app kept sending her orders at 32 seconds an item, while the crates she was on waited. Picking stood at ${pct(picking)}.`,
    });
  }
  if (state.arjun.response) {
    const used = state.assign.arjun !== "picking";
    crossScenario.push({
      title: "Trust carried forward",
      rating: state.arjun.outcome === "willing" ? "Strong" : state.arjun.outcome === "reluctant" ? "Mixed" : "Weak",
      text:
        state.arjun.outcome === "willing"
          ? `The conversation at 06:04 was honest and respectful. Arjun stayed through the peak${used ? " and covered other work at full pace when the surge came" : ""}.`
          : state.arjun.outcome === "leaving"
            ? "Arjun was not asked, or not persuaded, to stay. The store's fastest picker left at 06:30 as the peak began."
            : `The conversation at 06:04 left Arjun ${state.arjun.outcome}. He stayed${used ? ", and worked noticeably below his usual pace off his own job" : ""}.`,
    });
  }
  if (state.kase.firstMove) {
    const farhanCount = state.kase.countOwner === "farhan";
    const counter = state.kase.countOwner;
    const countsTrained = counter !== null && counter !== "me" && taskFit(counter, "count").fit >= 0.8;
    crossScenario.push({
      title: "Using the team on inventory",
      rating: farhanCount ? "Strong" : counter === "me" ? "Manager-dependent" : "Mixed",
      text: farhanCount
        ? "Farhan — count-trained and cleared for the cage — did the recount in four minutes while the manager stayed on the floor through the start of the surge."
        : counter === "me"
          ? "The manager recounted the cage personally with a count-trained associate free. The surge landed during those five minutes."
          : countsTrained
            ? `${nameOf(counter!)} did the recount: trained for cycle counts, though not the associate cleared for the high-value cage. It took a minute longer, and the manager stayed on the floor.`
            : counter
              ? `${nameOf(counter)} was sent to count, which is not what they are trained for, and their own work ran short while they did.`
              : "The variance was never counted, so nobody on the team was used for it.",
    });
  }
  if (state.floor && state.triageAt) {
    const c = formFor(state.form).constraint;
    const then = state.floor.projected[c];
    const now = state.triageAt.coverage[c];
    crossScenario.push({
      title: "The floor built at 05:56 met the surge at 06:09",
      // The stage the surge hit can be fine while the store is behind somewhere else.
      rating: now >= 0.95 ? (state.triageAt.ctd <= CTD_TARGET ? "Strong" : "Mixed") : now >= 0.85 ? "Mixed" : "Exposed",
      text:
        `${STATION_LABEL[c]} ${c === "riders" ? "were" : "was"} set at ${pct(then)} of the forecast in the floor build. When the surge landed ${c === "riders" ? "they" : "it"} stood at ${pct(now)}, with ${state.triageAt.ordersWaiting} orders waiting and CTD at ${state.triageAt.ctd}s.` +
        (now >= 0.95 && state.triageAt.ctd > CTD_TARGET
          ? ` Where the surge hit was covered; the store was behind elsewhere (picking ${pct(state.triageAt.coverage.picking)}, putaway ${pct(state.triageAt.coverage.putaway)}, riders ${pct(state.triageAt.coverage.riders)}).`
          : ""),
    });
  }

  // "Strong" means strong throughout: no control flag, and no part of leading
  // a team where the shift showed nothing at all. Those are things to probe.
  const teamGap = teamSubscores.some((s) => s.observed && s.score < 34);
  const LADDER = [
    "ADDITIONAL ASSESSMENT RECOMMENDED",
    "MIXED EVIDENCE — REVIEW",
    "PROMISING — PROBE SPECIFIC AREAS",
    "STRONG EVIDENCE — PROCEED TO INTERVIEW",
  ] as const;
  const earnedRung =
    overall >= 75 && flags.length === 0 && scoreMap.teamManagement >= 65 && !teamGap
      ? 3
      : overall >= 62 && competencies.every((c) => !c.observed || c.score >= 40)
        ? 2
        : overall >= 48
          ? 1
          : 0;
  // An unfinished shift is scored on what was seen, and what was seen can only
  // support so much. "Strong" needs the whole shift; under half of it supports
  // nothing but a second look.
  const share = observed / opportunities;
  const ceiling = !incomplete ? 3 : share >= 0.85 ? 2 : share >= 0.5 ? 1 : 0;
  const indication = LADDER[Math.min(earnedRung, ceiling)]!;

  const weak = evidence
    .filter((e) => e.score <= 1 && !e.behaviourTags.includes("not_reached") && PROBES[e.behaviourId])
    .sort((a, b) => a.score - b.score || assessmentWeights[b.competencyId] - assessmentWeights[a.competencyId]);
  const seenAreas = new Set<string>();
  const probes = weak
    .filter((e) => {
      const area = PROBES[e.behaviourId]!.area;
      if (seenAreas.has(area)) return false;
      seenAreas.add(area);
      return true;
    })
    .slice(0, 5)
    .map((e) => ({ area: PROBES[e.behaviourId]!.area, evidence: `${e.title}. ${e.candidateAction}`, probe: PROBES[e.behaviourId]!.probe }));

  const best = evidence.filter((e) => e.score === 3).sort((a, b) => assessmentWeights[b.competencyId] - assessmentWeights[a.competencyId]);
  const lowest = [...competencies].filter((c) => c.observed > 0).sort((a, b) => a.score - b.score)[0] ?? competencies[0]!;
  const recs = evidence
    .filter((e) => reached(e) && e.score <= 1 && RECOMMENDATIONS[e.behaviourId])
    .sort((a, b) => a.score - b.score || assessmentWeights[b.competencyId] - assessmentWeights[a.competencyId])
    .map((e) => RECOMMENDATIONS[e.behaviourId]!);
  const fallback = evidence.filter((e) => e.score === 2 && RECOMMENDATIONS[e.behaviourId]).map((e) => RECOMMENDATIONS[e.behaviourId]!);

  return {
    version: ASSESSMENT_VERSION,
    form: state.form,
    overall,
    incomplete,
    observed,
    opportunities,
    competencies,
    decisions,
    evidence,
    flags,
    indication,
    teamSubscores,
    teamEffect,
    crossScenario,
    probes,
    signature: signatureOf(scoreMap, evidence, overall),
    // A store nobody finished running did not end any particular way.
    outcomeTitle: incomplete ? "SHIFT NOT COMPLETED" : (state.outcome?.title ?? "SHIFT NOT COMPLETED"),
    candidate: {
      strongest: best.slice(0, 3).map((e) => ({ title: e.title, text: e.laterConsequence ?? e.stateAfter })),
      development: {
        label: lowest.label,
        text: `${incomplete ? "Your lowest of those you reached" : "Your lowest of the five"}, across ${lowest.decisions} decision${lowest.decisions === 1 ? "" : "s"} in the shift.`,
      },
      // Always three: the weakest moments first, then the partial ones, then the
      // standing advice for the lowest competency.
      recommendations: [...new Set([...recs, ...fallback, ...STANDING_ADVICE[lowest.id]])].slice(0, 3),
    },
    stats: {
      delegated: state.delegations.length,
      delegatedWell: well,
      personalDelegable: hoarded,
      maxCtd: state.expiry ? state.expiry.maxCtd : state.maxCtd,
      finalCtd: state.outcome?.finalCtd ?? null,
      trust: Math.round(state.trust),
      cost: state.cost,
    },
  };
}
