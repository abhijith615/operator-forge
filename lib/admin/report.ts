import "server-only";

import ExcelJS from "exceljs";

import { buildOperatorProfile } from "@/lib/challenge/day-six/profile";
import { CORE_SKILL_OF, coreScoresOf } from "@/lib/challenge/day-six/skills";
import { DIMENSIONS, DIMENSION_LABEL, type ChallengeResult } from "@/lib/challenge/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The participant report, as a workbook.
 *
 * One person per row on the first sheet, because that is how somebody reads a
 * cohort; one participant-day per row on the second, because that is how they
 * pivot it. The skills sheet carries every skill under its own name for the
 * people who want the detail the five-skill roll-up removes.
 *
 * Personal data throughout — names, numbers and emails. The caller has to have
 * checked the requester is an admin; the database function checks it again and
 * refuses regardless.
 */

export const DAY_TITLES = [
  "Run a Live Dark Store",
  "Investigate Inventory Losses",
  "Build and Lead Your Team",
  "Fix the Operational Bottleneck",
  "Protect the Customer Promise",
] as const;

interface RawDay {
  day: number;
  opened_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  score: number | null;
  band: string | null;
  sop_breaches: number | null;
  competencies: { dimension: string; label: string; score: number }[];
}

interface RawRow {
  registration_id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  registered_at: string;
  paid_at: string | null;
  days: RawDay[];
}

export async function readReportRows(): Promise<RawRow[] | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_challenge_report");
  if (error || !data) return null;
  return dedupe(data as RawRow[]);
}

/**
 * One row per person. A registration can be submitted twice — a double tap, a
 * second attempt after a payment error — and two rows for one human would
 * double-count them in every funnel number. Keep the paid one, else the
 * latest.
 */
function dedupe(rows: RawRow[]): RawRow[] {
  const best = new Map<string, RawRow>();
  for (const row of rows) {
    const key = row.email.toLowerCase();
    const held = best.get(key);
    if (!held) {
      best.set(key, row);
      continue;
    }
    const better =
      (row.paid_at && !held.paid_at) ||
      (Boolean(row.paid_at) === Boolean(held.paid_at) && row.registered_at > held.registered_at);
    if (better) best.set(key, row);
  }
  return [...best.values()].sort((a, b) => a.registered_at.localeCompare(b.registered_at));
}

/* ── Derivation ───────────────────────────────────────────────────────── */

const IST_OFFSET_MS = 330 * 60_000;

/**
 * Excel dates carry no timezone, so an IST reading has to be baked into the
 * value. Shifting by the offset makes the cell *display* the Indian clock time
 * whatever machine opens the file; the notes sheet says so.
 */
function ist(value: string | number | null): Date | null {
  if (value === null) return null;
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms + IST_OFFSET_MS);
}

type DayStatus = "Completed" | "Opened, not finished" | "Not opened";

interface DayView {
  day: number;
  status: DayStatus;
  opened: Date | null;
  /** Completion time minus duration. Only knowable for a finished shift. */
  began: Date | null;
  completed: Date | null;
  minutes: number | null;
  score: number | null;
  band: string | null;
  sop: number | null;
  core: Record<(typeof DIMENSIONS)[number], number | null>;
  native: RawDay["competencies"];
}

function viewDay(raw: RawDay | undefined, day: number): DayView {
  const completedMs = raw?.completed_at ? Date.parse(raw.completed_at) : null;
  const status: DayStatus = completedMs !== null
    ? "Completed"
    : raw?.opened_at
      ? "Opened, not finished"
      : "Not opened";
  const competencies = raw?.competencies ?? [];
  return {
    day,
    status,
    opened: ist(raw?.opened_at ?? null),
    began:
      completedMs !== null && raw?.duration_ms
        ? ist(completedMs - raw.duration_ms)
        : null,
    completed: ist(completedMs),
    minutes: raw?.duration_ms ? Math.round((raw.duration_ms / 60_000) * 10) / 10 : null,
    score: raw?.score ?? null,
    band: raw?.band ?? null,
    sop: raw?.sop_breaches ?? null,
    core: coreScoresOf(competencies),
    native: competencies,
  };
}

interface Person {
  row: RawRow;
  paid: boolean;
  days: DayView[];
  completed: number;
  /** First day not finished. Null when all five are. */
  dropOff: number | null;
  lastOpened: number | null;
  status: string;
  profile: ReturnType<typeof buildOperatorProfile>;
}

function derive(row: RawRow): Person {
  const byDay = new Map(row.days.map((entry) => [entry.day, entry]));
  const days = [1, 2, 3, 4, 5].map((day) => viewDay(byDay.get(day), day));
  const done = days.filter((entry) => entry.status === "Completed");
  const touched = days.filter((entry) => entry.status !== "Not opened");
  const paid = row.paid_at !== null;
  const firstUnfinished = days.find((entry) => entry.status !== "Completed")?.day ?? null;

  const status = !paid
    ? "Registered, not paid"
    : done.length === 5
      ? "Completed all five days"
      : touched.length === 0
        ? "Paid, has not started"
        : `Stopped at Day ${firstUnfinished} (${done.length} of 5 done)`;

  // Built through the same function the participant's own Day 6 page uses, so
  // the two cannot disagree about what their week amounted to. The competencies
  // here are only read for their dimension and score, hence the cast.
  const profile = buildOperatorProfile({
    runs: done.map((entry) => ({ day: entry.day, score: entry.score ?? 0, band: entry.band ?? "" })),
    results: done.map(
      (entry) =>
        ({
          day: entry.day,
          score: entry.score ?? 0,
          band: entry.band ?? "",
          competencies: entry.native.map((c) => ({ ...c, blurb: "" })),
          sopViolations: Array.from({ length: entry.sop ?? 0 }),
          decisionCount: 0,
          durationMs: (entry.minutes ?? 0) * 60_000,
        }) as unknown as ChallengeResult,
    ),
  });

  return {
    row,
    paid,
    days,
    completed: done.length,
    dropOff: firstUnfinished,
    lastOpened: touched.length ? Math.max(...touched.map((entry) => entry.day)) : null,
    status,
    profile,
  };
}

/* ── Styling ──────────────────────────────────────────────────────────── */

const INK = "FF0B0B0B";
const YELLOW = "FFF5C400";
const BAND_FILL = ["FF1F2A44", "FF2B3A2B", "FF3A2B3A", "FF3A3320", "FF24383A"] as const;
const DATE_FORMAT = "dd-mmm-yyyy hh:mm";

function styleHeader(row: ExcelJS.Row, fill = INK) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 34;
}

function widths(sheet: ExcelJS.Worksheet, values: number[]) {
  values.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

const percent = (part: number, whole: number) => (whole === 0 ? null : part / whole);

/* ── The workbook ─────────────────────────────────────────────────────── */

export async function buildReportWorkbook(rows: RawRow[]): Promise<ExcelJS.Workbook> {
  const people = rows.map(derive);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Operator Forge";
  workbook.created = new Date();

  const coreLabels = DIMENSIONS.map((dimension) => DIMENSION_LABEL[dimension]);

  /* ── 1 · Participants ───────────────────────────────────────────── */
  const sheet = workbook.addWorksheet("Participants", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
  });

  const lead = [
    "Name", "Phone", "Email", "Registered", "Paid", "Paid on",
    "Status", "Days completed", "Drop-off day", "Last day opened",
  ];
  const perDay = [
    "Opened day", "Shift began (approx.)", "Completed", "Minutes",
    "Day score", ...coreLabels, "SOP breaches",
  ];
  const day6 = [
    "Days used", "Week average", "Band", "Signature", ...coreLabels,
  ];

  // Row 1: bands, so thirteen columns do not read as one undifferentiated wall.
  const bands = sheet.addRow([]);
  const header = sheet.addRow([
    ...lead,
    ...[1, 2, 3, 4, 5].flatMap(() => perDay),
    ...day6,
  ]);

  let cursor = lead.length + 1;
  sheet.mergeCells(1, 1, 1, lead.length);
  bands.getCell(1).value = "Participant";
  [1, 2, 3, 4, 5].forEach((day) => {
    sheet.mergeCells(1, cursor, 1, cursor + perDay.length - 1);
    bands.getCell(cursor).value = `Day ${day} · ${DAY_TITLES[day - 1]}`;
    for (let c = cursor; c < cursor + perDay.length; c += 1) {
      bands.getCell(c).fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL[day - 1]! },
      };
    }
    cursor += perDay.length;
  });
  sheet.mergeCells(1, cursor, 1, cursor + day6.length - 1);
  bands.getCell(cursor).value = "Day 6 · Operator Profile (all completed days)";
  styleHeader(bands, YELLOW);
  bands.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: INK }, size: 10 };
  });
  for (let c = lead.length + 1; c < cursor; c += 1) {
    const band = Math.floor((c - lead.length - 1) / perDay.length);
    const cell = bands.getCell(c);
    if (band < 5) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL[band]! } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    }
  }
  bands.height = 24;
  styleHeader(header);

  for (const person of people) {
    const { row } = person;
    const profile = person.profile;
    const values: (string | number | Date | null)[] = [
      row.full_name ?? "",
      row.phone ?? "",
      row.email,
      ist(row.registered_at),
      person.paid ? "Yes" : "No",
      ist(row.paid_at),
      person.status,
      person.paid ? person.completed : null,
      person.paid ? person.dropOff : null,
      person.lastOpened,
    ];

    for (const view of person.days) {
      values.push(
        view.opened,
        view.began,
        view.completed,
        view.minutes,
        view.score,
        ...DIMENSIONS.map((dimension) => view.core[dimension]),
        view.sop,
      );
    }

    values.push(
      person.completed,
      profile.overall,
      profile.band,
      person.completed > 0 ? profile.signature.name : null,
      ...DIMENSIONS.map(
        (dimension) =>
          profile.main.find((skill) => skill.dimension === dimension)?.score ?? null,
      ),
    );

    const added = sheet.addRow(values);
    added.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = DATE_FORMAT;
    });
  }

  widths(sheet, [
    22, 16, 30, 17, 7, 17, 30, 10, 10, 10,
    ...[1, 2, 3, 4, 5].flatMap(() => [17, 17, 17, 9, 9, 11, 11, 11, 11, 11, 9]),
    9, 10, 24, 20, 11, 11, 11, 11, 11,
  ]);
  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: header.cellCount },
  };

  /* ── 2 · Daywise ────────────────────────────────────────────────── */
  const long = workbook.addWorksheet("Daywise", { views: [{ state: "frozen", ySplit: 1 }] });
  long.addRow([
    "Name", "Email", "Paid", "Day", "Day title", "Status", "Opened day",
    "Shift began (approx.)", "Completed", "Minutes", "Day score", "Band",
    ...coreLabels, "SOP breaches",
  ]);
  styleHeader(long.getRow(1));
  for (const person of people) {
    for (const view of person.days) {
      if (view.status === "Not opened") continue;
      const added = long.addRow([
        person.row.full_name ?? "", person.row.email, person.paid ? "Yes" : "No",
        view.day, DAY_TITLES[view.day - 1], view.status, view.opened, view.began,
        view.completed, view.minutes, view.score, view.band,
        ...DIMENSIONS.map((dimension) => view.core[dimension]), view.sop,
      ]);
      added.eachCell((cell) => {
        if (cell.value instanceof Date) cell.numFmt = DATE_FORMAT;
      });
    }
  }
  widths(long, [22, 30, 7, 6, 30, 20, 17, 17, 17, 9, 9, 24, 11, 11, 11, 11, 11, 9]);
  long.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 18 } };

  /* ── 3 · Skill detail ───────────────────────────────────────────── */
  const detail = workbook.addWorksheet("Skill detail", { views: [{ state: "frozen", ySplit: 1 }] });
  detail.addRow(["Name", "Email", "Day", "Skill (as the day names it)", "Rolls up to", "Score"]);
  styleHeader(detail.getRow(1));
  for (const person of people) {
    for (const view of person.days) {
      for (const skill of view.native) {
        const core = CORE_SKILL_OF[skill.dimension];
        detail.addRow([
          person.row.full_name ?? "", person.row.email, view.day, skill.label,
          core ? DIMENSION_LABEL[core] : "(not placed)", Math.round(skill.score),
        ]);
      }
    }
  }
  widths(detail, [22, 30, 6, 34, 28, 8]);
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

  /* ── 4 · Drop-off ───────────────────────────────────────────────── */
  const funnel = workbook.addWorksheet("Drop-off");
  funnel.addRow([
    "Day", "Title", "Paid participants", "Opened", "Completed",
    "Opened, not finished", "Never opened", "Completed % of paid",
    "Completed % of opened", "Finished previous day, not this one",
  ]);
  styleHeader(funnel.getRow(1));
  const paidPeople = people.filter((person) => person.paid);
  [1, 2, 3, 4, 5].forEach((day) => {
    const views = paidPeople.map((person) => person.days[day - 1]!);
    const opened = views.filter((view) => view.status !== "Not opened").length;
    const completed = views.filter((view) => view.status === "Completed").length;
    const stalled = views.filter((view) => view.status === "Opened, not finished").length;
    const skippedAhead =
      day === 1
        ? null
        : paidPeople.filter(
            (person) =>
              person.days[day - 2]!.status === "Completed" &&
              person.days[day - 1]!.status !== "Completed",
          ).length;
    const added = funnel.addRow([
      day, DAY_TITLES[day - 1], paidPeople.length, opened, completed, stalled,
      paidPeople.length - opened, percent(completed, paidPeople.length),
      percent(completed, opened), skippedAhead,
    ]);
    added.getCell(8).numFmt = "0%";
    added.getCell(9).numFmt = "0%";
  });
  widths(funnel, [6, 32, 12, 9, 11, 14, 12, 14, 14, 18]);

  /* ── 5 · Notes ──────────────────────────────────────────────────── */
  const notes = workbook.addWorksheet("Notes");
  notes.getColumn(1).width = 28;
  notes.getColumn(2).width = 110;
  const lines: [string, string][] = [
    ["Generated", `${new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ")} IST`],
    ["Times", "Every date and time is Indian Standard Time (IST)."],
    ["Who is included", "Everyone who registered, paid or not. Admin accounts are excluded. A person registered twice appears once."],
    ["Opened day", "When the participant first loaded that day's page. This is when they arrived, not when the clock started — the intro and video come first. It is the only signal for someone who left without finishing, and it exists from the point tracking was switched on."],
    ["Shift began (approx.)", "Completion time minus the shift duration. Only known for a finished day."],
    ["Drop-off day", "The first of Days 1 to 5 the participant has not finished. Days can be played in any order once the cohort starts, so this is where their run of finished days ends, not necessarily the last day they touched."],
    ["Day score", "That day's overall score as shown on the participant's scorecard."],
    ["The five skills", "Only Day 1 scores against the five directly. Days 2 to 5 each score the skills they were built around, under their own names, and each of those is rolled up into one of the five (see the Skill detail sheet for the mapping). A skill a day did not test is left blank, not zero."],
    ["Day 6", "Computed by the same code as the participant's own Operator Profile page. Week average is the mean of the day scores for completed days; each of the five skills is the mean of that skill across the days that tested it. 'Days used' says how many days it rests on — treat anything under five as provisional."],
    ["Personal data", "Names, phone numbers and emails. Handle accordingly and do not share this file beyond the people who need it."],
  ];
  lines.forEach(([key, value]) => {
    const added = notes.addRow([key, value]);
    added.getCell(1).font = { bold: true };
    added.getCell(2).alignment = { wrapText: true, vertical: "top" };
    added.getCell(1).alignment = { vertical: "top" };
  });

  return workbook;
}
