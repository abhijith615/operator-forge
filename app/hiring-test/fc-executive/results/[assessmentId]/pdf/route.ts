import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin/queries";
import { buildFcBrief } from "@/lib/fc/brief";
import { fcResultFrom, isCurrentFc, readFcAttemptById } from "@/lib/fc/server";
import { briefFileName, renderBriefPdf } from "@/lib/hiring/brief-pdf";

/**
 * The two-page FC Executive candidate profile as a PDF. Admins only; anyone
 * else gets a 404 rather than a refusal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  if (!(await isAdmin())) notFound();
  const attempt = await readFcAttemptById(assessmentId);
  // An earlier version cannot be replayed, so there is no result to print.
  if (!attempt || !isCurrentFc(attempt)) notFound();

  const { result } = fcResultFrom(attempt.actions);
  const candidate = attempt.candidate_name?.trim() || "Candidate";
  const pdf = await renderBriefPdf(buildFcBrief(result, { candidate, completedAt: attempt.completed_at ?? attempt.started_at }));
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${briefFileName(candidate).replace("Candidate-Profile-", "FC-Executive-Profile-")}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
