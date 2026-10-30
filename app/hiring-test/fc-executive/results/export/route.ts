import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin/queries";
import { buildFcWorkbook } from "@/lib/fc/export";
import { readFcAttempts } from "@/lib/fc/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** FC Executive item-level data as an .xlsx download. Admins only; 404 for anybody else. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const workbook = buildFcWorkbook(await readFcAttempts());
  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FC-Executive-Test-Data-${stamp}.xlsx"`,
      // Personal data. Never in a shared cache, never resurrected by a back button.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
