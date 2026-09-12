import { ARJUN, RIYA } from "./workforce";
import type {
  AcknowledgeId,
  ArjunOutcome,
  ArjunState,
  ClarifyId,
  Day3State,
  PeopleState,
  RequestId,
  RiyaAction,
  RiyaState,
} from "./types";

/**
 * The people module's judgement.
 *
 * Two short managerial moments, read the way the rest of Day 3 is read: from
 * what the operator actually did, deterministically, with no correct answer on
 * a list. Arjun's is a communication problem — the incentive is real, approved
 * and late, and the only thing missing is somebody checking and saying so.
 * Riya's is a diagnosis problem — she is slow on average and fast everywhere
 * except the one aisle where the packs look alike.
 *
 * Nothing here rewards being friendly. A warm answer that was never checked
 * scores below a plain one that was, because the shift runs on what is true.
 */

/* ── Arjun's three sentences ──────────────────────────────────────────── */

export interface ResponseOption<T extends string> {
  id: T;
  text: string;
  /** Shown under the option only where the floor would already know it. */
  note?: string;
}

export const ACKNOWLEDGE: ResponseOption<AcknowledgeId>[] = [
  { id: "achievement", text: "You hit the target." },
  { id: "understand", text: "I understand why you're asking." },
  { id: "takes-time", text: "Incentives take time. Don't worry about it." },
  { id: "everyone", text: "Everyone else is waiting too." },
];

export const CLARIFY: ResponseOption<ClarifyId>[] = [
  { id: "approved-pending", text: "Your incentive is approved and showing as pending." },
  { id: "tomorrow", text: "It's expected in tomorrow's payout." },
  { id: "cant-confirm", text: "I can't confirm the status right now." },
  { id: "guarantee", text: "I'll personally guarantee it's paid tonight." },
];

export const REQUEST: ResponseOption<RequestId>[] = [
  { id: "able-to", text: "Can you tell me if you're able to extend tonight?" },
  { id: "extend", text: "Can you extend until 10?" },
  { id: "must-stay", text: "You have to stay tonight." },
  { id: "replace", text: "If you leave, I'll replace you." },
  { id: "no-ask", text: "Don't worry about tonight — finish your shift." },
];

export function arjunSaid(state: ArjunState): string[] {
  const { acknowledge, clarify, request } = state.response;
  return [
    ACKNOWLEDGE.find((option) => option.id === acknowledge)?.text,
    CLARIFY.find((option) => option.id === clarify)?.text,
    REQUEST.find((option) => option.id === request)?.text,
  ].filter((line): line is string => Boolean(line));
}

export function arjunComplete(state: ArjunState): boolean {
  const { acknowledge, clarify, request } = state.response;
  return Boolean(acknowledge && clarify && request);
}

function coercive(request: RequestId | null): boolean {
  return request === "must-stay" || request === "replace";
}

function dismissive(acknowledge: AcknowledgeId | null): boolean {
  return acknowledge === "takes-time" || acknowledge === "everyone";
}

/** A status statement is only accurate if the operator went and looked. */
export function statedStatus(state: ArjunState): boolean {
  const clarify = state.response.clarify;
  return clarify === "approved-pending" || clarify === "tomorrow";
}

export function accurateStatus(state: ArjunState): boolean {
  return statedStatus(state) && state.incentiveChecked;
}

/**
 * What Arjun does with his evening.
 *
 * He stays when he is told something true that he can check tomorrow, and
 * asked rather than told. He refuses on a threat or on a promise the manager
 * cannot keep — the same promise he was given last Sunday.
 */
export function arjunOutcomeOf(state: ArjunState): ArjunOutcome {
  if (!arjunComplete(state)) return "unaddressed";
  const { acknowledge, clarify, request } = state.response;
  if (coercive(request) || clarify === "guarantee") return "refused";
  if (request === "no-ask") return "not-asked";
  return accurateStatus(state) && !dismissive(acknowledge) ? "extended" : "held";
}

export function arjunReply(state: ArjunState): string[] {
  switch (state.outcome) {
    case "extended":
      return ["Okay.", "If it's already approved, I can stay until 10."];
    case "held":
      return statedStatus(state) && !state.incentiveChecked
        ? ["That's what we were told last Sunday.", "I'll finish my shift at 8."]
        : ["I'll finish my scheduled shift.", "I can't extend tonight."];
    case "refused":
      return state.response.clarify === "guarantee"
        ? ["Someone promised that last Sunday too.", "I'll finish at 8."]
        : ["Then I'll finish at 8, like the rota says."];
    case "not-asked":
      return ["Okay. Thanks for checking.", "I'll finish at 8."];
    default:
      return ["He waited, then went back to his lane."];
  }
}

export const ARJUN_OUTCOME_LABEL: Record<ArjunOutcome, string> = {
  extended: "Staying until 10 PM",
  held: "Finishing at 8 PM",
  refused: "Finishing at 8 PM · trust lost",
  "not-asked": "Finishing at 8 PM · never asked",
  unaddressed: "Never spoken to",
};

/* ── Arjun, scored ────────────────────────────────────────────────────── */

const ACK_COMM: Record<AcknowledgeId, number> = {
  achievement: 20,
  understand: 15,
  "takes-time": 5,
  everyone: 0,
};

const REQUEST_COMM: Record<RequestId, number> = {
  "able-to": 20,
  extend: 17,
  "no-ask": 8,
  "must-stay": 4,
  replace: 0,
};

/**
 * Communication: checked first, said in private, acknowledged the work, said
 * what was true, and asked rather than ordered. A friendly conversation with
 * no facts behind it tops out around 60.
 */
export function arjunCommunication(state: ArjunState): number {
  if (!state.outcome || state.outcome === "unaddressed") return 15;
  const { acknowledge, clarify, request } = state.response;
  let score = state.incentiveChecked ? 25 : 0;
  score += state.location === "aside" ? 10 : 3;
  score += acknowledge ? ACK_COMM[acknowledge] : 0;
  if (clarify === "guarantee") score += 0;
  else if (clarify === "cant-confirm") score += state.incentiveChecked ? 8 : 15;
  else if (accurateStatus(state)) score += clarify === "approved-pending" ? 25 : 22;
  else score += 10;
  score += request ? REQUEST_COMM[request] : 0;
  return Math.max(0, Math.min(100, score));
}

/** How Arjun leaves the conversation feeling about the store's word. */
export function arjunTrust(state: ArjunState): number {
  if (!state.outcome || state.outcome === "unaddressed") return 20;
  const { acknowledge, clarify, request } = state.response;
  let score = state.location === "aside" ? 15 : 5;
  score += acknowledge === "achievement" ? 20 : acknowledge === "understand" ? 18 : acknowledge === "takes-time" ? 5 : 0;
  if (clarify === "guarantee") score += 0;
  else if (clarify === "cant-confirm") score += state.incentiveChecked ? 8 : 18;
  else if (accurateStatus(state)) score += 30;
  else score += 12;
  score += request === "able-to" ? 25 : request === "no-ask" ? 22 : request === "extend" ? 20 : request === "must-stay" ? 5 : 0;
  if (state.incentiveChecked) score += 10;
  return Math.max(0, Math.min(100, score));
}

/** Whether the evening's expectations were made clear, one way or another. */
export function arjunStandards(state: ArjunState): number {
  if (!state.outcome || state.outcome === "unaddressed") return 10;
  const { clarify, request } = state.response;
  let score =
    request === "must-stay" || request === "replace"
      ? 80
      : request === "no-ask"
        ? 15
        : 65;
  if (clarify === "guarantee") score += 5;
  else if (accurateStatus(state)) score += 35;
  else score += 15;
  return Math.max(0, Math.min(100, score));
}

/* ── Riya, scored ─────────────────────────────────────────────────────── */

export function riyaHas(state: RiyaState, action: RiyaAction): boolean {
  return state.interventions.includes(action);
}

/** What tonight's intervention is worth, before the diagnosis behind it. */
function riyaInterventionValue(state: RiyaState): number {
  const zone = riyaHas(state, "zone");
  const pair = riyaHas(state, "pair");
  const coach = riyaHas(state, "coach");
  const warn = riyaHas(state, "warn");
  if (riyaHas(state, "remove")) return coach ? 15 : 5;
  if (riyaHas(state, "packing")) return coach ? 12 : 5;
  if (zone && coach) return 70;
  if (pair && coach) return 68;
  if (zone && pair) return 55;
  if (pair) return 55;
  if (zone) return 50;
  if (coach) return warn ? 32 : riyaHas(state, "keep") ? 38 : 40;
  if (warn) return 8;
  return 12;
}

/**
 * People judgement on Riya: the intervention, discounted where it was made
 * without looking at where she is actually slow, plus credit for the looking.
 */
export function riyaJudgement(state: RiyaState): number {
  if (!state.applied) return 15;
  if (state.defaulted) return 20;
  const evidence = (state.trendViewed ? 10 : 0) + (state.zonesViewed ? 10 : 0) + (state.zoneCFound ? 10 : 0);
  const value = riyaInterventionValue(state);
  const diagnosed = state.zoneCFound ? 1 : state.zonesViewed ? 0.85 : 0.6;
  return Math.max(0, Math.min(100, Math.round(evidence + value * diagnosed)));
}

/** Whether Riya was treated as a person with a problem or a problem to remove. */
export function riyaTrust(state: RiyaState): number {
  if (!state.applied || state.defaulted) return 20;
  let score = 40;
  if (state.zoneCFound) score += 20;
  if (riyaHas(state, "coach")) score += 20;
  if (riyaHas(state, "pair")) score += 15;
  if (riyaHas(state, "zone")) score += 10;
  if (riyaHas(state, "keep")) score += 5;
  if (riyaHas(state, "remove")) score -= 30;
  if (riyaHas(state, "packing")) score -= 15;
  if (riyaHas(state, "warn")) score -= state.zoneCFound ? 10 : 25;
  return Math.max(0, Math.min(100, score));
}

/** Whether the pace was actually addressed, and the quality bar held. */
export function riyaStandards(state: RiyaState): number {
  if (!state.applied) return 10;
  if (state.defaulted) return 45;
  let score = 0;
  if (riyaHas(state, "zone")) score += 35;
  if (riyaHas(state, "pair")) score += 30;
  if (riyaHas(state, "coach")) score += 30;
  if (riyaHas(state, "warn")) score += 40;
  if (riyaHas(state, "remove")) score += 45;
  if (riyaHas(state, "keep")) score += 15;
  if (riyaHas(state, "packing")) score += 10;
  else score += 20;
  if (state.zoneCFound) score += 10;
  return Math.max(0, Math.min(100, score));
}

/** What tonight's choice does for the eleven-day-old picker next week. */
export function riyaDevelopment(state: RiyaState): "High" | "Medium" | "Low" {
  if (riyaHas(state, "coach")) return "High";
  if (riyaHas(state, "pair")) return "Medium";
  return "Low";
}

/* ── The balance ──────────────────────────────────────────────────────── */

export interface PeopleBalance {
  trust: number;
  standards: number;
  label: string;
  name: string;
  body: string;
}

/**
 * Trust and standards read separately, because they fail separately. A manager
 * can be liked and unclear, or obeyed and not believed; the useful reading is
 * which of the two the evening was short of.
 */
export function peopleBalance(people: PeopleState): PeopleBalance {
  const trust = Math.round(0.55 * arjunTrust(people.arjun) + 0.45 * riyaTrust(people.riya));
  const standards = Math.round(0.45 * arjunStandards(people.arjun) + 0.55 * riyaStandards(people.riya));
  const high = (value: number) => value >= 65;

  if (high(trust) && high(standards)) {
    return {
      trust,
      standards,
      label: "HIGH TRUST / HIGH STANDARDS",
      name: "Balanced people leader",
      body: "You asked rather than ordered, said what you could stand behind, and still held the pace the peak needed.",
    };
  }
  if (high(trust)) {
    return {
      trust,
      standards,
      label: "HIGH TRUST / LOW ACCOUNTABILITY",
      name: "Supportive, expectations unclear",
      body: "People were treated well. Neither of them left the conversation knowing what was expected of them tonight.",
    };
  }
  if (high(standards)) {
    return {
      trust,
      standards,
      label: "LOW TRUST / HIGH CONTROL",
      name: "Control over commitment",
      body: "The evening got its instructions. It did not get two people who believed what they were told — which is the coverage you lose next Onam, not tonight.",
    };
  }
  return {
    trust,
    standards,
    label: "LOW TRUST / LOW STANDARDS",
    name: "People issues left to drift",
    body: "Neither problem was diagnosed and neither was closed. Arjun and Riya both went back to the floor with what they walked up with.",
  };
}

/** Both moments as the scorecard and the timeline need them. */
export function peopleOf(state: Day3State): PeopleState {
  return state.people;
}
