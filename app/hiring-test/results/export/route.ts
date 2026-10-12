import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin/queries";
import { buildItemWorkbook } from "@/lib/hiring/export";
import { readAllAttempts } from "@/lib/hiring/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Item-level Hiring Test data as an .xlsx download. Admins only.
 *
 * Answers 404 to anybody else, so the route does not confirm it exists; the
 * database function behind it refuses non-admins as well.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const workbook = buildItemWorkbook(await readAllAttempts());
  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Hiring-Test-Item-Data-${stamp}.xlsx"`,
      // Personal data. Never in a shared cache, never resurrected by a back button.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
