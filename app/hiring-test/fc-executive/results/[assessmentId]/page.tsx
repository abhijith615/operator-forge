import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FcEmployerProfile } from "@/components/fc/employer-profile";
import { isAdmin } from "@/lib/admin/queries";
import { fcResultFrom, isCurrentFc, readFcAttemptById } from "@/lib/fc/server";

export const metadata: Metadata = { title: "FC Executive readiness", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** One FC Executive candidate's result. Admins only; anybody else gets a 404. */
export default async function FcResultPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  if (!(await isAdmin())) notFound();
  const attempt = await readFcAttemptById(assessmentId);
  if (!attempt) notFound();
  if (!isCurrentFc(attempt)) {
    return (
      <div className="min-h-dvh bg-void text-hi">
        <main id="main" className="mx-auto max-w-xl px-4 pt-10 pb-20 sm:px-6">
          <Link href="/hiring-test/fc-executive/results" className="text-[13.5px] text-mid underline underline-offset-4 hover:text-hi">
            ← All FC Executive candidates
          </Link>
          <h1 className="mt-6 text-[24px] leading-tight font-bold tracking-[-0.03em] text-hi">Sat on version {attempt.assessment_version}</h1>
          <p className="mt-1 text-[14px] text-mid">{attempt.candidate_name?.trim() || "Unnamed candidate"}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-mid">
            This attempt was sat on an earlier version of the FC shift, which started from a different floor. A result is the candidate’s choices
            replayed through the shift they were made in, so it is not re-scored by this version. The attempt is kept as recorded ({attempt.actions.length} choices).
          </p>
        </main>
      </div>
    );
  }
  const { result } = fcResultFrom(attempt.actions);
  return (
    <>
      <p className="bg-void px-4 pt-5 text-center text-[13.5px] text-mid">
        <Link href="/hiring-test/fc-executive/results" className="underline underline-offset-4 hover:text-hi">
          ← All FC Executive candidates
        </Link>
      </p>
      <FcEmployerProfile
        result={result}
        meta={{
          candidate: attempt.candidate_name?.trim() || "Unnamed candidate",
          phone: attempt.candidate_phone,
          completedAt: attempt.completed_at,
          device: attempt.device_type,
          session: attempt.session,
          pdfHref: `/hiring-test/fc-executive/results/${encodeURIComponent(assessmentId)}/pdf`,
        }}
      />
    </>
  );
}
