import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin/queries";
import { readAllAttempts, resultFrom } from "@/lib/hiring/server";

export const metadata: Metadata = {
  title: "Hiring Test — candidates",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";

/**
 * Every attempt, newest first. Admins only.
 *
 * Scores are replayed from the saved actions as the page renders, the same way
 * the individual profile does it, so the list and the profile cannot disagree.
 */
export default async function HiringResultsPage() {
  if (!(await isAdmin())) notFound();
  const attempts = await readAllAttempts();

  const rows = attempts.map((attempt) => {
    const finished = attempt.status !== "in_progress";
    const result = finished ? resultFrom(attempt.scenario_variant, attempt.actions).result : null;
    return { attempt, result };
  });

  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6">
        <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-[-0.03em] text-hi">Candidates</h1>
        <p className="mt-1.5 text-[14px] text-mid">
          {rows.length} attempt{rows.length === 1 ? "" : "s"}.{" "}
          <Link href="/hiring-test/results/sample" className="underline underline-offset-4 hover:text-hi">
            Sample profile
          </Link>
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-[18px] border border-line bg-surface p-6 text-[14.5px] text-mid">Nobody has sat the Hiring Test yet.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map(({ attempt, result }) => (
              <li key={attempt.id}>
                <Link
                  href={`/hiring-test/results/${attempt.id}`}
                  className="grid gap-x-4 gap-y-1 rounded-[18px] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-bright sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-hi">{attempt.candidate_email}</p>
                    <p className="mt-0.5 text-[12.5px] text-lo">
                      {when(attempt.started_at)} · Form {attempt.scenario_variant} · v{attempt.assessment_version}
                      {attempt.device_type ? ` · ${attempt.device_type}` : ""}
                      {attempt.status === "expired" ? " · ran out of time" : ""}
                    </p>
                  </div>
                  <p className="text-[13px] text-mid sm:text-right">
                    {result ? result.indication : "In progress"}
                    {result && result.flags.length ? (
                      <span className="ml-2 rounded-full border border-alert-500/45 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] text-alert-500">
                        {result.flags.length} FLAG{result.flags.length > 1 ? "S" : ""}
                      </span>
                    ) : null}
                  </p>
                  <p className="tabular text-[26px] leading-none font-bold text-hi sm:w-16 sm:text-right">{result ? result.overall : "—"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
