import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployerProfile } from "@/components/hiring/employer-profile";
import { isAdmin } from "@/lib/admin/queries";
import { SAMPLE_CANDIDATE, sampleResult } from "@/lib/hiring/sample";
import { candidateLabel, isCurrentVersion, readAttempt, resultFrom } from "@/lib/hiring/server";
import { ASSESSMENT_VERSION } from "@/lib/hiring/weights";

export const metadata: Metadata = {
  title: "Dark Store Manager Readiness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ROLE: Record<string, string> = { asm: "Assistant Store Manager", sm: "Store Manager" };

/**
 * The employer's result.
 *
 * `sample` is public and simulated. Anything else is a real candidate's
 * attempt and is for admins only for now — there are no employer accounts yet,
 * so there is nobody else it could safely be shown to. Anyone else gets a 404
 * rather than a refusal, which would confirm the attempt exists.
 */
export default async function HiringResultPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;

  if (assessmentId === "sample") {
    return (
      <>
        <EmployerProfile
          result={sampleResult()}
          meta={{ candidate: SAMPLE_CANDIDATE, role: "Assistant Store Manager", form: "A", version: ASSESSMENT_VERSION, sample: true }}
        />
        <p className="bg-void pb-12 text-center text-[13.5px] text-mid">
          <Link href="/hiring-test" className="underline underline-offset-4 hover:text-hi">
            About the Hiring Test
          </Link>
        </p>
      </>
    );
  }

  if (!(await isAdmin())) notFound();
  const attempt = await readAttempt(assessmentId);
  if (!attempt) notFound();

  // Sat on an earlier simulation: the actions are kept, and cannot be replayed on this one.
  if (!isCurrentVersion(attempt)) {
    return (
      <div className="min-h-dvh bg-void text-hi">
        <main id="main" className="mx-auto max-w-xl px-4 pt-10 pb-20 sm:px-6">
          <p className="text-[13.5px] text-mid">
            <Link href="/hiring-test/results" className="underline underline-offset-4 hover:text-hi">
              ← All candidates
            </Link>
          </p>
          <h1 className="mt-6 text-[24px] leading-tight font-bold tracking-[-0.03em] text-hi">Sat on version {attempt.assessment_version}</h1>
          <p className="mt-1 text-[14px] text-mid">{candidateLabel(attempt)}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-mid">
            This attempt was sat on an earlier version of the simulation, with a different store. A result is the
            candidate’s decisions replayed through the store they were made in, so it cannot be produced by version{" "}
            {ASSESSMENT_VERSION}, and scores from the two versions are not comparable. The attempt is kept as recorded
            ({attempt.actions.length} decisions, {attempt.status === "completed" ? "completed" : "not completed"}). The
            candidate can sit the current version.
          </p>
        </main>
      </div>
    );
  }

  const { result } = resultFrom(attempt.scenario_variant, attempt.actions);
  return (
    <>
      <p className="bg-void px-4 pt-5 text-center text-[13.5px] text-mid">
        <Link href="/hiring-test/results" className="underline underline-offset-4 hover:text-hi">
          ← All candidates
        </Link>
      </p>
      <EmployerProfile
        result={result}
        meta={{
          candidate: candidateLabel(attempt),
          role: ROLE[attempt.role_id] ?? "ASM / SM",
          form: attempt.scenario_variant,
          version: attempt.assessment_version,
          startedAt: attempt.started_at,
          completedAt: attempt.completed_at,
          status: attempt.status,
          device: attempt.device_type,
          session: attempt.session,
        }}
      />
    </>
  );
}
