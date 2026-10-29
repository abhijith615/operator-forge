import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin/queries";
import { fcResultFrom, isCurrentFc, readFcAttempts } from "@/lib/fc/server";
import { formatWhatsapp } from "@/lib/hiring/phone";

export const metadata: Metadata = { title: "FC Executive candidates", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function when(value: string): string {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Every FC Executive attempt, newest first. Admins only. */
export default async function FcResultsPage() {
  if (!(await isAdmin())) notFound();
  const rows = (await readFcAttempts()).map((attempt) => ({
    attempt,
    current: isCurrentFc(attempt),
    result: attempt.status === "in_progress" || !isCurrentFc(attempt) ? null : fcResultFrom(attempt.actions).result,
  }));

  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6">
        <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Hiring Test · FC Executive</p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-[-0.03em] text-hi">Candidates</h1>
        <p className="mt-2 text-[14px] text-mid">
          Test link:{" "}
          <Link href="/hiring-test/fc-executive" className="underline underline-offset-4 hover:text-hi">
            /hiring-test/fc-executive
          </Link>{" "}
          · not listed anywhere yet.
        </p>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-[18px] border border-line bg-surface p-6 text-[14.5px] text-mid">Nobody has sat the FC Executive test yet.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map(({ attempt, current, result }) => (
              <li key={attempt.id}>
                <Link
                  href={`/hiring-test/fc-executive/results/${attempt.id}`}
                  className="grid gap-x-4 gap-y-1 rounded-[18px] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-bright sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-hi">{attempt.candidate_name?.trim() || "Unnamed candidate"}</p>
                    <p className="mt-0.5 text-[12.5px] text-lo">
                      {when(attempt.started_at)}
                      {attempt.candidate_phone ? ` · WhatsApp ${formatWhatsapp(attempt.candidate_phone)}` : ""}
                      {attempt.device_type ? ` · ${attempt.device_type}` : ""}
                      {result?.incomplete ? ` · not completed, ${result.observed} of ${result.opportunities}` : ""}
                    </p>
                  </div>
                  <p className="text-[13px] text-mid sm:text-right">
                    {!current ? `Earlier version (${attempt.assessment_version}) · not re-scored` : result ? result.indicationLabel : "In progress"}
                    {result?.flags.length ? (
                      <span className="ml-2 rounded-full border border-alert-500/45 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] text-alert-500">
                        {result.flags.length} FLAG{result.flags.length > 1 ? "S" : ""}
                      </span>
                    ) : null}
                  </p>
                  <p className="tabular text-[22px] font-bold text-hi sm:text-right">{result ? result.overall : "—"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
