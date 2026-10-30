import "server-only";

import ExcelJS from "exceljs";

import { expire, replay } from "./engine";
import { sampleResult } from "./sample";
import { DECISIONS, scoreAssessment, type AssessmentResult } from "./scoring";
import { isCurrentVersion, type AdminAttemptRow } from "./server";
import type { HiringState, SceneId } from "./types";
import { ASSESSMENT_SECONDS, COMPETENCIES, COMPETENCY_LABEL } from "./weights";

/**
 * Item-level data, for the analysis the scores cannot do on themselves.
 *
 * One row per finished attempt, with every behaviour and every decision as its
 * own column — the shape a reliability coefficient, a factor analysis, a
 * differential-item-functioning test or an item response model is run on. The
 * scores on a profile are only as good as those analyses say, and none of them
 * can be run until there are enough rows here.
 *
 * Two conventions that matter to whoever opens the file. A blank cell means
 * the candidate never reached that moment: it is missing data, not a zero, and
 * must be treated as missing. And the decision columns, not the behaviour
 * columns, are the unit to analyse — behaviours inside one decision are not
 * independent of each other, which is exactly why they are grouped.
 *
 * Personal data: email addresses. Admin-only, like the page it hangs off.
 */

const SCENES: SceneId[] = ["handover", "floor", "absence", "riya", "arjun", "case", "nilpick", "triage", "bottleneck", "customer", "final"];

interface Scored {
  attempt: AdminAttemptRow;
  state: HiringState;
  result: AssessmentResult;
}

function score(attempt: AdminAttemptRow): Scored {
  const played = replay(attempt.scenario_variant, attempt.actions);
  const state = played.outcome ? played : expire(played);
  return { attempt, state, result: scoreAssessment(state) };
}

/** Real seconds spent in each scene: the gap before each action, charged to the scene it was taken in. */
function sceneSeconds(state: HiringState): Record<string, number> {
  const out: Record<string, number> = {};
  let previous = 0;
  for (const entry of state.log) {
    out[entry.scene] = (out[entry.scene] ?? 0) + Math.max(0, entry.realMs - previous);
    previous = entry.realMs;
  }
  return Object.fromEntries(Object.entries(out).map(([scene, ms]) => [scene, Math.round(ms / 1000)]));
}

const ist = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) : "";

function header(sheet: ExcelJS.Worksheet): void {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
}

export function buildItemWorkbook(attempts: AdminAttemptRow[]): ExcelJS.Workbook {
  // Only attempts sat on this simulation: an earlier one cannot be replayed on it,
  // and its scores would not be comparable if it could.
  const finished = attempts.filter((attempt) => attempt.status !== "in_progress" && isCurrentVersion(attempt)).map(score);
  const reference = sampleResult();
  const behaviours = reference.evidence.map((event) => event.behaviourId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Operator Forge";
  workbook.created = new Date();

  /* ── Attempts ───────────────────────────────────────────────────────── */
  const attemptsSheet = workbook.addWorksheet("Attempts");
  attemptsSheet.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "candidate_email", key: "email", width: 32 },
    { header: "candidate_name", key: "name", width: 26 },
    { header: "candidate_whatsapp", key: "phone", width: 16 },
    { header: "form", key: "form", width: 7 },
    { header: "version", key: "version", width: 9 },
    { header: "device", key: "device", width: 10 },
    { header: "status", key: "status", width: 11 },
    { header: "started_ist", key: "started", width: 22 },
    { header: "time_limit_s", key: "limit", width: 13 },
    { header: "extra_time_s", key: "extra", width: 13 },
    { header: "real_seconds_used", key: "used", width: 12 },
    { header: "actions", key: "actions", width: 9 },
    { header: "incomplete", key: "incomplete", width: 11 },
    { header: "ended_in_scene", key: "endedIn", width: 14 },
    { header: "behaviours_observed", key: "observed", width: 12 },
    { header: "decisions_observed", key: "decisions", width: 12 },
    { header: "overall", key: "overall", width: 9 },
    { header: "overall_reached", key: "overallReached", width: 10 },
    ...COMPETENCIES.map((id) => ({ header: `score_${id}`, key: `score_${id}`, width: 14 })),
    ...COMPETENCIES.map((id) => ({ header: `decisions_${id}`, key: `decisions_${id}`, width: 14 })),
    { header: "indication", key: "indication", width: 40 },
    { header: "flags", key: "flags", width: 8 },
    { header: "flag_ids", key: "flagIds", width: 30 },
    { header: "signature", key: "signature", width: 34 },
    { header: "max_ctd_s", key: "maxCtd", width: 10 },
    { header: "tab_hidden", key: "hidden", width: 10 },
    { header: "went_offline", key: "offline", width: 11 },
    { header: "resumed", key: "resume", width: 9 },
    { header: "assistant_questions", key: "assistant", width: 12 },
    ...SCENES.map((scene) => ({ header: `seconds_${scene}`, key: `seconds_${scene}`, width: 12 })),
  ];

  for (const { attempt, state, result } of finished) {
    const seconds = sceneSeconds(state);
    const limit = attempt.time_limit_seconds ?? ASSESSMENT_SECONDS;
    const session = attempt.session ?? {};
    attemptsSheet.addRow({
      id: attempt.id,
      email: attempt.candidate_email,
      name: attempt.candidate_name ?? "",
      phone: attempt.candidate_phone ?? "",
      form: attempt.scenario_variant,
      version: attempt.assessment_version,
      device: attempt.device_type ?? "",
      status: attempt.status,
      started: ist(attempt.started_at),
      limit,
      extra: limit - ASSESSMENT_SECONDS,
      used: Math.round((state.log[state.log.length - 1]?.realMs ?? 0) / 1000),
      actions: attempt.actions.length,
      incomplete: result.incomplete ? 1 : 0,
      endedIn: state.expiry?.scene ?? "",
      observed: result.observed,
      decisions: result.decisions.filter((d) => d.observed).length,
      overall: result.overall,
      overallReached: result.reachedOverall,
      ...Object.fromEntries(result.competencies.map((c) => [`score_${c.id}`, c.decisions ? c.score : null])),
      ...Object.fromEntries(result.competencies.map((c) => [`decisions_${c.id}`, c.decisions])),
      indication: result.indication,
      flags: result.flags.length,
      flagIds: result.flags.map((flag) => flag.id).join(" "),
      signature: result.signature.name,
      maxCtd: result.stats.maxCtd,
      hidden: session.hidden ?? 0,
      offline: session.offline ?? 0,
      resume: session.resume ?? 0,
      assistant: session.assistant ?? 0,
      ...Object.fromEntries(SCENES.map((scene) => [`seconds_${scene}`, seconds[scene] ?? null])),
    });
  }
  header(attemptsSheet);

  /* ── Decisions: the unit to analyse ─────────────────────────────────── */
  const decisionSheet = workbook.addWorksheet("Decisions");
  decisionSheet.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "form", key: "form", width: 7 },
    { header: "device", key: "device", width: 10 },
    { header: "incomplete", key: "incomplete", width: 11 },
    ...DECISIONS.map((decision) => ({ header: decision.id, key: decision.id, width: 13 })),
  ];
  for (const { attempt, result } of finished) {
    decisionSheet.addRow({
      id: attempt.id,
      form: attempt.scenario_variant,
      device: attempt.device_type ?? "",
      incomplete: result.incomplete ? 1 : 0,
      ...Object.fromEntries(result.decisions.map((d) => [d.id, d.observed ? d.score : null])),
    });
  }
  header(decisionSheet);

  /* ── Behaviours ─────────────────────────────────────────────────────── */
  const behaviourSheet = workbook.addWorksheet("Behaviours");
  behaviourSheet.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "form", key: "form", width: 7 },
    { header: "device", key: "device", width: 10 },
    { header: "incomplete", key: "incomplete", width: 11 },
    ...behaviours.map((id) => ({ header: id, key: id, width: 6 })),
  ];
  for (const { attempt, result } of finished) {
    behaviourSheet.addRow({
      id: attempt.id,
      form: attempt.scenario_variant,
      device: attempt.device_type ?? "",
      incomplete: result.incomplete ? 1 : 0,
      ...Object.fromEntries(result.evidence.map((e) => [e.behaviourId, e.behaviourTags.includes("not_reached") ? null : e.score])),
    });
  }
  header(behaviourSheet);

  /* ── Codebook ───────────────────────────────────────────────────────── */
  const codebook = workbook.addWorksheet("Codebook");
  codebook.columns = [
    { header: "column", key: "column", width: 22 },
    { header: "sheet", key: "sheet", width: 12 },
    { header: "competency", key: "competency", width: 24 },
    { header: "decision", key: "decision", width: 30 },
    { header: "what it records", key: "meaning", width: 70 },
    { header: "scale", key: "scale", width: 26 },
  ];
  for (const decision of DECISIONS) {
    codebook.addRow({
      column: decision.id,
      sheet: "Decisions",
      competency: COMPETENCY_LABEL[decision.competencyId],
      decision: decision.label,
      meaning: `Share of points earned across behaviours ${decision.behaviours.join(", ")}.`,
      scale: "0–100; blank = not reached",
    });
  }
  for (const event of reference.evidence) {
    const decision = DECISIONS.find((entry) => entry.behaviours.includes(event.behaviourId));
    codebook.addRow({
      column: event.behaviourId,
      sheet: "Behaviours",
      competency: COMPETENCY_LABEL[event.competencyId],
      decision: decision?.label ?? "",
      meaning: event.claim,
      scale: "0–3; blank = not reached",
    });
  }
  const notes: [string, string][] = [
    ["Blank cells", "The candidate never reached that moment. Missing, not zero: exclude or model as missing, never recode to 0."],
    ["Unit of analysis", "Use the Decisions sheet for reliability (omega, alpha), factor structure and item models. Behaviours inside one decision share a cause and are not independent."],
    ["Competency score", "The plain average of that competency's observed decision scores. overall_reached is each competency weighted by its weight times the share of its decisions observed, divided by the weight seen: quality on what was reached. overall divides by the full weight instead, so moments not reached count as zero. The two are equal on a finished shift."],
    ["incomplete", "1 = the plan was never locked (time ran out or the candidate left). ended_in_scene says where."],
    ["candidate_name", "The name typed at the start by somebody who sat it without signing in. Not verified. candidate_email is blank for those rows."],
    ["candidate_whatsapp", "The WhatsApp number typed with the name, as +91 and ten digits. Not verified. Blank for signed-in attempts and for attempts started before 28 Oct 2026."],
    ["form", "A, B or C. Compare score distributions by form before treating the forms as equivalent."],
    ["version", "Every row is the current simulation version. Attempts sat on an earlier version are left out: they were played in a different store and cannot be pooled with these."],
    ["device", "mobile, tablet or desktop at the start. Use for differential-functioning and time-limit checks."],
    ["extra_time_s", "Extra time arranged as an accommodation. Sensitive: use for fairness analysis only, and never share with an employer."],
    ["seconds_*", "Real seconds spent in each scene. Not scored. Available for speed–accuracy modelling."],
    ["Not collected", "Gender, language, age and region are not collected, so differential functioning by those groups cannot be tested from this file."],
    ["Sample sizes", "Rough guides: about 200 finished attempts for reliability and factor structure; about 200 per group for differential functioning; 85 or more hires tracked for 90 days for prediction."],
  ];
  codebook.addRow({});
  for (const [column, meaning] of notes) codebook.addRow({ column, sheet: "Note", meaning });
  header(codebook);
  codebook.getColumn("meaning").alignment = { wrapText: true, vertical: "top" };

  return workbook;
}
