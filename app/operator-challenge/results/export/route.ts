import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin/queries";
import { formatWhatsapp } from "@/lib/hiring/phone";
import { levelLabel, readChallengeRows } from "@/lib/operator-challenge/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ist = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short", hour12: false }) : "";

const STATUS = { registered: "Not started", in_progress: "In progress", completed: "Finished", expired: "Out of time" } as const;

/**
 * Startup Operator Challenge participants as an .xlsx download. Admins only.
 *
 * Answers 404 to anybody else, so the route does not confirm it exists; the
 * database function behind it refuses non-admins as well.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const rows = (await readChallengeRows()) ?? [];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Participants", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "WhatsApp", key: "phone", width: 17 },
    { header: "City", key: "city", width: 16 },
    { header: "Education", key: "education", width: 11 },
    { header: "College", key: "college", width: 30 },
    { header: "Graduation year", key: "gradYear", width: 10 },
    { header: "Working now", key: "working", width: 10 },
    { header: "Signed up (IST)", key: "registered", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Started (IST)", key: "started", width: 20 },
    { header: "Finished (IST)", key: "finished", width: 20 },
    { header: "Device", key: "device", width: 9 },
    { header: "Score", key: "score", width: 7 },
    { header: "Level", key: "level", width: 18 },
    { header: "Moments reached", key: "reached", width: 10 },
    { header: "Moments in all", key: "all", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      name: row.fullName,
      email: row.email,
      phone: formatWhatsapp(row.phone),
      city: row.city,
      education: row.education === "student" ? "Student" : "Graduate",
      college: row.college,
      gradYear: row.gradYear,
      working: row.working ? "Yes" : "No",
      registered: ist(row.registeredAt),
      status: row.earlierVersion ? `${STATUS[row.status]} (earlier version)` : STATUS[row.status],
      started: ist(row.startedAt),
      finished: row.status === "completed" || row.status === "expired" ? ist(row.completedAt) : "",
      device: row.device ?? "",
      score: row.scorecard?.overall ?? null,
      level: row.scorecard ? levelLabel(row.scorecard.level) : "",
      reached: row.scorecard?.observed ?? null,
      all: row.scorecard?.opportunities ?? null,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Startup-Operator-Challenge-${stamp}.xlsx"`,
      // Personal data. Never in a shared cache, never resurrected by a back button.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
