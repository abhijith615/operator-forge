import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { isAdmin } from "@/lib/admin/queries";
import { setAccommodation } from "@/lib/hiring/actions";
import { formatWhatsapp } from "@/lib/hiring/phone";
import { candidateLabel, isCurrentVersion, readAccommodations, readAllAttempts, resultFrom } from "@/lib/hiring/server";
import { ASSESSMENT_SECONDS, ASSESSMENT_VERSION } from "@/lib/hiring/weights";

export const metadata: Metadata = {
  title: "Hiring Test — candidates",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";

const field =
  "min-h-[44px] rounded-[12px] border border-line-strong bg-void px-3 text-[14px] text-hi placeholder:text-faint focus:border-ember-500/60 focus:outline-none";

/**
 * Every attempt, newest first. Admins only.
 *
 * Scores are replayed from the saved actions as the page renders, the same way
 * the individual profile does it, so the list and the profile cannot disagree.
 *
 * Extra time is arranged here too, by email address, before a candidate
 * starts. It is an accommodation: it appears on this page and in the item
 * data for fairness analysis, and never on a candidate's result.
 */
export default async function HiringResultsPage() {
  if (!(await isAdmin())) notFound();
  const [attempts, accommodations] = await Promise.all([readAllAttempts(), readAccommodations()]);

  const rows = attempts.map((attempt) => {
    // An attempt sat on an earlier simulation cannot be replayed on this one.
    const current = isCurrentVersion(attempt);
    const finished = attempt.status !== "in_progress";
    const result = finished && current ? resultFrom(attempt.scenario_variant, attempt.actions).result : null;
    return { attempt, result, current };
  });
  const finished = rows.filter((row) => row.result).length;
  const earlier = rows.filter((row) => !row.current).length;

  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6">
        <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-[-0.03em] text-hi">Candidates</h1>
        <p className="mt-1.5 text-[14px] text-mid">
          {rows.length} attempt{rows.length === 1 ? "" : "s"}, {finished} finished on version {ASSESSMENT_VERSION}
          {earlier ? `, ${earlier} on an earlier version` : ""}.{" "}
          <Link href="/hiring-test/results/sample" className="underline underline-offset-4 hover:text-hi">
            Sample profile
          </Link>
        </p>

        <div className="mt-5 rounded-[18px] border border-line bg-surface p-4">
          <a
            href="/hiring-test/results/export"
            download
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-5 text-[13.5px] font-semibold text-hi transition-colors hover:border-line-bright hover:bg-white/[0.08]"
          >
            <Download className="size-4" aria-hidden />
            Download item-level data (Excel)
          </a>
          <p className="mt-2 text-[12.5px] leading-snug text-lo">
            One row per finished attempt, with every decision and behaviour as a column, time per scene, form and
            device. For reliability, form comparison and fairness analysis — which need about 200 finished attempts
            before they mean anything. Contains email addresses.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-[18px] border border-line bg-surface p-6 text-[14.5px] text-mid">Nobody has sat the Hiring Test yet.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map(({ attempt, result, current }) => (
              <li key={attempt.id}>
                <Link
                  href={`/hiring-test/results/${attempt.id}`}
                  className="grid gap-x-4 gap-y-1 rounded-[18px] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-bright sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-hi">{candidateLabel(attempt)}</p>
                    <p className="mt-0.5 text-[12.5px] text-lo">
                      {when(attempt.started_at)} · Form {attempt.scenario_variant} · v{attempt.assessment_version}
                      {attempt.device_type ? ` · ${attempt.device_type}` : ""}
                      {attempt.candidate_email ? "" : " · name only, not verified"}
                      {attempt.candidate_phone ? ` · WhatsApp ${formatWhatsapp(attempt.candidate_phone)}` : ""}
                      {(attempt.time_limit_seconds ?? ASSESSMENT_SECONDS) > ASSESSMENT_SECONDS ? " · extra time" : ""}
                      {result?.incomplete ? ` · not completed, ${result.observed} of ${result.opportunities} moments` : ""}
                    </p>
                  </div>
                  <p className="text-[13px] text-mid sm:text-right">
                    {!current ? "Earlier version · not scored" : result ? result.indication : "In progress"}
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

        <section className="mt-10 rounded-[18px] border border-line bg-surface p-4 sm:p-5" aria-labelledby="extra-time">
          <h2 id="extra-time" className="text-[18px] font-bold tracking-[-0.02em] text-hi">
            Extra time
          </h2>
          <p className="mt-1 text-[13.5px] leading-snug text-mid">
            An accommodation for a candidate who has asked for one — a disability, a health condition, a screen reader.
            Arrange it by email address before they start; an attempt already under way keeps the time it began with.
            It is not shown on the candidate’s result or to an employer.
          </p>

          {accommodations === null ? (
            <p className="mt-4 rounded-[12px] border border-warn-500/40 bg-warn-500/[0.07] px-3.5 py-3 text-[13.5px] leading-snug text-hi">
              Extra time needs a database update that has not been run yet. Until it is, every candidate gets thirty
              minutes. The SQL is in <code className="text-mid">supabase/schema.sql</code>, under “Consent, per-attempt
              time limits and extra-time accommodations”.
            </p>
          ) : (
            <>
              <form action={setAccommodation} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)_auto]">
                <label className="sr-only" htmlFor="acc-email">
                  Candidate email
                </label>
                <input id="acc-email" name="email" type="email" required placeholder="candidate@example.com" autoComplete="off" className={field} />
                <label className="sr-only" htmlFor="acc-percent">
                  Extra time
                </label>
                <select id="acc-percent" name="percent" defaultValue="25" className={field}>
                  <option value="25">+25% · 37½ min</option>
                  <option value="50">+50% · 45 min</option>
                  <option value="100">+100% · 60 min</option>
                </select>
                <label className="sr-only" htmlFor="acc-note">
                  Note
                </label>
                <input id="acc-note" name="note" maxLength={200} placeholder="Note for your own records (optional)" autoComplete="off" className={field} />
                <button
                  type="submit"
                  className="min-h-[44px] rounded-full bg-ember-500 px-5 text-[13.5px] font-bold tracking-[0.04em] text-void uppercase transition-[filter] hover:brightness-110"
                >
                  Arrange
                </button>
              </form>

              {accommodations.length ? (
                <ul className="mt-4 divide-y divide-line">
                  {accommodations.map((entry) => (
                    <li key={entry.email} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-hi">{entry.email}</span>
                      <span className="tabular text-[13px] text-mid">
                        +{Math.round((entry.extra_seconds / ASSESSMENT_SECONDS) * 100)}% · {Math.round((ASSESSMENT_SECONDS + entry.extra_seconds) / 60)} min
                      </span>
                      {entry.note ? <span className="w-full text-[12.5px] text-lo sm:w-auto">{entry.note}</span> : null}
                      <form action={setAccommodation}>
                        <input type="hidden" name="email" value={entry.email} />
                        <input type="hidden" name="percent" value="0" />
                        <button type="submit" className="text-[13px] text-mid underline underline-offset-4 hover:text-hi">
                          Withdraw
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-lo">Nobody has extra time arranged.</p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
