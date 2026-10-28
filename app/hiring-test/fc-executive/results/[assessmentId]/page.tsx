import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FcEmployerProfile } from "@/components/fc/employer-profile";
import { isAdmin } from "@/lib/admin/queries";
import { fcResultFrom, readFcAttemptById } from "@/lib/fc/server";

export const metadata: Metadata = { title: "FC Executive readiness", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** One FC Executive candidate's result. Admins only; anybody else gets a 404. */
export default async function FcResultPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  if (!(await isAdmin())) notFound();
  const attempt = await readFcAttemptById(assessmentId);
  if (!attempt) notFound();
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
        meta={{ candidate: attempt.candidate_name?.trim() || "Unnamed candidate", phone: attempt.candidate_phone, completedAt: attempt.completed_at, device: attempt.device_type, session: attempt.session }}
      />
    </>
  );
}
