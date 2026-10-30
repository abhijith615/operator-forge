import "server-only";

import ExcelJS from "exceljs";

import { FC_BEHAVIOURS, scoreFc, type FcResult } from "./scoring";
import { expire, replay } from "./engine";
import { isCurrentFc, type FcAdminRow } from "./server";
import { SCENES, type FcState } from "./types";
import { FC_COMPETENCIES, FC_COMPETENCY_LABEL, FC_SECONDS } from "./weights";

/**
 * FC Executive item-level data, for the analysis the scores cannot do on
 * themselves: one row per finished attempt, every behaviour its own column.
 *
 * A blank behaviour cell means the candidate never reached that moment. It is
 * missing data, not a zero. Personal data: names and WhatsApp numbers.
 */

const TIMED = SCENES.filter((scene) => scene !== "done");

interface Scored {
  attempt: FcAdminRow;
  state: FcState;
  result: FcResult;
}

function score(attempt: FcAdminRow): Scored {
  const played = replay(attempt.actions);
  const finished = played.scene === "done" && played.expiredIn === null;
  const state = finished ? played : expire(played);
  return { attempt, state, result: scoreFc(state) };
}

/** Real seconds in each scene: the gap before each action, charged to the scene it was taken in. */
function sceneSeconds(state: FcState): Record<string, number> {
  const out: Record<string, number> = {};
  let previous = 0;
  for (const entry of state.log) {
    out[entry.scene] = (out[entry.scene] ?? 0) + Math.max(0, entry.realMs - previous);
    previous = entry.realMs;
  }
  return Object.fromEntries(Object.entries(out).map(([scene, ms]) => [scene, Math.round(ms / 1000)]));
}

const ist = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) : "");

function header(sheet: ExcelJS.Worksheet): void {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
}

export function buildFcWorkbook(attempts: FcAdminRow[]): ExcelJS.Workbook {
  const finished = attempts
    .filter((attempt) => isCurrentFc(attempt) && attempt.actions.length > 0)
    .map(score)
    // Still being sat right now: nothing final to export yet.
    .filter(({ attempt }) => attempt.status !== "in_progress" || Date.now() - Date.parse(attempt.started_at) > ((attempt.time_limit_seconds ?? FC_SECONDS) + 300) * 1000);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Operator Forge";
  workbook.created = new Date();

  /* ── Attempts ───────────────────────────────────────────────────────── */
  const sheet = workbook.addWorksheet("Attempts");
  sheet.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "candidate_name", key: "name", width: 26 },
    { header: "candidate_whatsapp", key: "phone", width: 16 },
    { header: "version", key: "version", width: 9 },
    { header: "device", key: "device", width: 10 },
    { header: "status", key: "status", width: 11 },
    { header: "started_ist", key: "started", width: 22 },
    { header: "completed_ist", key: "completedAt", width: 22 },
    { header: "real_seconds_used", key: "used", width: 12 },
    { header: "actions", key: "actions", width: 9 },
    { header: "incomplete", key: "incomplete", width: 11 },
    { header: "ended_in_scene", key: "endedIn", width: 14 },
    { header: "behaviours_observed", key: "observed", width: 12 },
    { header: "overall", key: "overall", width: 9 },
    ...FC_COMPETENCIES.map((id) => ({ header: `score_${id}`, key: `score_${id}`, width: 10 })),
    { header: "indication", key: "indication", width: 40 },
    { header: "flags", key: "flags", width: 8 },
    { header: "flag_ids", key: "flagIds", width: 34 },
    { header: "tab_hidden", key: "hidden", width: 10 },
    { header: "went_offline", key: "offline", width: 11 },
    { header: "resumed", key: "resume", width: 9 },
    { header: "assistant_questions", key: "assistant", width: 12 },
    ...TIMED.map((scene) => ({ header: `seconds_${scene}`, key: `seconds_${scene}`, width: 12 })),
  ];
  for (const { attempt, state, result } of finished) {
    const seconds = sceneSeconds(state);
    const session = attempt.session ?? {};
    sheet.addRow({
      id: attempt.id,
      name: attempt.candidate_name ?? "",
      phone: attempt.candidate_phone ?? "",
      version: attempt.assessment_version,
      device: attempt.device_type ?? "",
      status: attempt.status,
      started: ist(attempt.started_at),
      completedAt: ist(attempt.completed_at),
      used: Math.round((state.log[state.log.length - 1]?.realMs ?? 0) / 1000),
      actions: attempt.actions.length,
      incomplete: result.incomplete ? 1 : 0,
      endedIn: state.expiredIn ?? "",
      observed: result.observed,
      overall: result.overall,
      ...Object.fromEntries(result.competencies.map((c) => [`score_${c.id}`, c.observed ? c.score : null])),
      indication: result.indicationLabel,
      flags: result.flags.length,
      flagIds: result.flags.map((flag) => flag.id).join(" "),
      hidden: session.hidden ?? 0,
      offline: session.offline ?? 0,
      resume: session.resume ?? 0,
      assistant: session.assistant ?? 0,
      ...Object.fromEntries(TIMED.map((scene) => [`seconds_${scene}`, seconds[scene] ?? null])),
    });
  }
  header(sheet);

  /* ── Behaviours ─────────────────────────────────────────────────────── */
  const behaviours = workbook.addWorksheet("Behaviours");
  behaviours.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "candidate_name", key: "name", width: 26 },
    { header: "incomplete", key: "incomplete", width: 11 },
    ...FC_BEHAVIOURS.map((def) => ({ header: def.id, key: def.id, width: 6 })),
  ];
  for (const { attempt, result } of finished) {
    behaviours.addRow({
      id: attempt.id,
      name: attempt.candidate_name ?? "",
      incomplete: result.incomplete ? 1 : 0,
      ...Object.fromEntries(result.evidence.map((e) => [e.id, e.reached ? e.score : null])),
    });
  }
  header(behaviours);

  /* ── What they did: the evidence in words ───────────────────────────── */
  const evidence = workbook.addWorksheet("Evidence");
  evidence.columns = [
    { header: "assessment_id", key: "id", width: 38 },
    { header: "candidate_name", key: "name", width: 22 },
    { header: "behaviour", key: "behaviour", width: 9 },
    { header: "title", key: "title", width: 30 },
    { header: "score", key: "score", width: 7 },
    { header: "what they did", key: "did", width: 90 },
  ];
  for (const { attempt, result } of finished) {
    for (const e of result.evidence) {
      evidence.addRow({ id: attempt.id, name: attempt.candidate_name ?? "", behaviour: e.id, title: e.title, score: e.reached ? e.score : null, did: e.did });
    }
  }
  header(evidence);
  evidence.getColumn("did").alignment = { wrapText: true, vertical: "top" };

  /* ── Codebook ───────────────────────────────────────────────────────── */
  const codebook = workbook.addWorksheet("Codebook");
  codebook.columns = [
    { header: "column", key: "column", width: 22 },
    { header: "competency", key: "competency", width: 36 },
    { header: "what it records", key: "meaning", width: 80 },
    { header: "scale", key: "scale", width: 26 },
  ];
  for (const def of FC_BEHAVIOURS) {
    codebook.addRow({ column: def.id, competency: FC_COMPETENCY_LABEL[def.c], meaning: `${def.title}. Done well: ${def.strength}`, scale: "0–3; blank = not reached" });
  }
  const notes: [string, string][] = [
    ["Blank cells", "The candidate never reached that moment. Missing, not zero: exclude or model as missing, never recode to 0."],
    ["score_*", "Each competency's points earned out of points available, over the behaviours reached, as 0–100. Overall weights the five equally, by the share of each reached."],
    ["incomplete", "1 = the shift was not finished: time ran out or the candidate left. ended_in_scene says where, when time ran out."],
    ["candidate_name, candidate_whatsapp", "Typed at the start. Not verified."],
    ["version", "Every row is the current simulation version. Earlier versions are left out: they cannot be replayed on this one."],
    ["seconds_*", "Real seconds spent in each scene. Not scored."],
    ["Evidence sheet", "One row per behaviour per attempt, with what the candidate did in words: the same text as the full profile."],
  ];
  codebook.addRow({});
  for (const [column, meaning] of notes) codebook.addRow({ column, competency: "Note", meaning });
  header(codebook);
  codebook.getColumn("meaning").alignment = { wrapText: true, vertical: "top" };

  return workbook;
}
