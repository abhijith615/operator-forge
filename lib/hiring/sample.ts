import { PERSONAS, sitShift, type Style } from "./personas";
import { scoreAssessment, type AssessmentResult } from "./scoring";

/**
 * The sample profile.
 *
 * Not a real candidate, and not written by hand either: it is a shift actually
 * run through the engine by a simulated manager who is good and uneven — the
 * kind of profile an employer will mostly see. Builds a sound floor, handles
 * people well, delegates the count, and then recounts nothing but reads every
 * record personally, speaks to Arjun on the floor, fixes one control out of
 * two and does not check whether the bottleneck change worked.
 *
 * Because it comes out of the same scorer as a live attempt, the sample can
 * never show an employer something the product does not produce.
 */
const SAMPLE_STYLE: Style = {
  ...PERSONAS.balancedLeader,
  label: "Sample candidate",
  handover: ["team", "riders", "demand"],
  absence: ["reallocate", "extend"],
  riya: { inspect: true, choices: ["lockPutaway"] },
  arjun: { check: [], place: "here", ack: "recognise", clarify: "willCheck", request: "respectful" },
  kase: {
    ...PERSONAS.balancedLeader.kase,
    tools: ["orders", "scan", "access"],
    units: ["explained", "unresolved", "unresolved"],
    steps: ["controlAccess", "escalate"],
    controls: ["scanAtIssue", "remindTeam"],
  },
  nil: { look: "sources", sources: ["overstock", "replenArea"], resolve: "replenish", restockBy: "me" },
  triage: { constraint: "handle", aisle: "delegate", followUp: "later" },
  bottleneck: { ...PERSONAS.balancedLeader.bottleneck, panels: "constraint", check: false },
  bag: { cleanerBag: 2, liner: false, by: "me" },
};

export const SAMPLE_CANDIDATE = "sample.candidate@example.com";

let cached: AssessmentResult | null = null;

export function sampleResult(): AssessmentResult {
  cached ??= scoreAssessment(sitShift("A", SAMPLE_STYLE).state);
  return cached;
}
