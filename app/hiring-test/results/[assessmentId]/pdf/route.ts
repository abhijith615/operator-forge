import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin/queries";
import { buildEmployerBrief } from "@/lib/hiring/brief";
import { briefFileName, renderBriefPdf } from "@/lib/hiring/brief-pdf";
import { sampleResult } from "@/lib/hiring/sample";
import { candidateLabel, isCurrentVersion, readAttempt, resultFrom } from "@/lib/hiring/server";

/**
 * The two-page candidate profile as a PDF, for an employer to keep or forward.
 *
 * Same access as the full profile: `sample` is public, a real attempt is for
 * admins only, and anyone else gets a 404 rather than a refusal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfResponse(pdf: Buffer, candidate: string) {
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${briefFileName(candidate)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;

  if (assessmentId === "sample") {
    const brief = buildEmployerBrief(sampleResult(), { candidate: "Sample Candidate", sample: true });
    return pdfResponse(await renderBriefPdf(brief), "Sample Candidate");
  }

  if (!(await isAdmin())) notFound();
  const attempt = await readAttempt(assessmentId);
  // An earlier version cannot be replayed, so there is no result to print.
  if (!attempt || !isCurrentVersion(attempt)) notFound();

  const { result } = resultFrom(attempt.scenario_variant, attempt.actions);
  const candidate = candidateLabel(attempt);
  const brief = buildEmployerBrief(result, {
    candidate,
    completedAt: attempt.completed_at ?? attempt.started_at,
  });
  return pdfResponse(await renderBriefPdf(brief), candidate);
}
