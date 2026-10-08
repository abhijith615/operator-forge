import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin/queries";
import { buildReportWorkbook, readReportRows } from "@/lib/admin/report";
import { getOperator } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
/** A thousand participants is a few seconds of work; the default is generous
 *  on paper and tight in practice once a cold start is added. */
export const maxDuration = 60;

/**
 * The participant report as an .xlsx download.
 *
 * Same stance as the snapshot route: not a back door, so it answers 404 to
 * anybody who should not have it. The database function refuses non-admins as
 * well, so a mistake here still cannot hand the data to the wrong person.
 */
export async function GET() {
  const operator = await getOperator();
  if (!operator || !(await isAdmin())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const rows = await readReportRows();
  if (!rows) {
    return NextResponse.json({ error: "Report unavailable." }, { status: 500 });
  }

  const workbook = await buildReportWorkbook(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Operator-Forge-Participants-${stamp}.xlsx"`,
      // Personal data. Never in a shared cache, never resurrected by a back button.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
