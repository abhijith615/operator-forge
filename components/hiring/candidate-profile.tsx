import { Download } from "lucide-react";

import type { CandidateProfile as Profile } from "@/lib/hiring/server";
import { cn } from "@/lib/utils";

/**
 * What the candidate takes away.
 *
 * Readiness, the five competencies, the best of what they did, the one area
 * to work on and three things to do about it. It is deliberately not the
 * employer's view: no evidence scores, no flags, no interview probes. Those
 * are for the person deciding, and showing them here would turn a profile
 * into an answer key for the next candidate.
 */
export function CandidateProfile({
  profile,
  email,
  downloadHref = "/hiring-test/assessment/download",
}: {
  profile: Profile;
  email: string;
  /** Where the PNG of this profile comes from. Null hides the button. */
  downloadHref?: string | null;
}) {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:pt-14">
        <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
        <h1 className="mt-2 text-[clamp(1.9rem,7vw,2.8rem)] leading-[1.03] font-bold tracking-[-0.04em] text-hi">
          Your dark store manager profile
        </h1>
        <p className="mt-2 text-[14px] break-all text-lo">{email}</p>
        {downloadHref ? (
          <a
            href={downloadHref}
            download
            className="mt-4 inline-flex min-h-[46px] items-center gap-2 rounded-full bg-ember-500 px-5 text-[13.5px] font-bold tracking-[0.06em] text-void uppercase transition-[filter] hover:brightness-110"
          >
            <Download className="size-4" aria-hidden />
            Download profile
          </a>
        ) : null}

        {profile.timedOut ? (
          <p className="mt-4 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13.5px] leading-snug text-mid">
            The time ran out before the shift did. You reached {profile.observed} of {profile.opportunities}{" "}
            assessed moments, and this profile is built only from those. Parts you did not reach are not scored against you.
          </p>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[20px] border border-ember-500/30 bg-ember-500/[0.06] p-5">
            <p className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Readiness</p>
            <p className="tabular mt-2 text-[64px] leading-none font-bold tracking-[-0.04em] text-hi">
              {profile.overall}
              <span className="ml-1.5 text-[20px] font-semibold text-lo">/ 100</span>
            </p>
            <p className="mt-4 font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">How the shift ended</p>
            <p className="mt-1 text-[15px] font-semibold text-hi">{profile.outcomeTitle}</p>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-5">
            <p className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Decision signature</p>
            <p className="mt-2 text-[20px] leading-tight font-bold tracking-[-0.02em] text-ember-500">{profile.signature.name}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mid">{profile.signature.blurb}</p>
          </div>
        </section>

        <section className="mt-3 rounded-[20px] border border-line bg-surface p-5">
          <h2 className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Five competencies</h2>
          <ul className="mt-4 space-y-3.5">
            {profile.competencies.map((competency) => (
              <li key={competency.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14.5px] font-medium text-hi">
                    {competency.label}
                    {competency.observed > 0 && competency.observed < competency.opportunities ? (
                      <span className="ml-2 text-[12px] font-normal text-lo">
                        from {competency.observed} of {competency.opportunities} moments
                      </span>
                    ) : null}
                  </span>
                  <span className={cn("tabular text-[15px] font-semibold", competency.observed ? "text-hi" : "text-lo")}>
                    {competency.observed ? competency.score : "Not reached"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 rounded-full bg-white/[0.07]"
                  role="img"
                  aria-label={competency.observed ? `${competency.label} ${competency.score} out of 100` : `${competency.label} not reached`}
                >
                  {competency.observed ? (
                    <div className={cn("h-full rounded-full", competency.score >= 70 ? "bg-ion-500" : competency.score >= 45 ? "bg-ember-500" : "bg-warn-500")} style={{ width: `${competency.score}%` }} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {profile.strongest.length ? (
          <section className="mt-3 rounded-[20px] border border-line bg-surface p-5">
            <h2 className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Strongest operating evidence</h2>
            <ul className="mt-3 space-y-3">
              {profile.strongest.map((item) => (
                <li key={item.title} className="border-l-2 border-ion-500/60 pl-3.5">
                  <p className="text-[15px] font-semibold text-hi">{item.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{item.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-3 rounded-[20px] border border-line bg-surface p-5">
          <h2 className="font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Development area</h2>
          <p className="mt-2 text-[18px] font-bold tracking-[-0.01em] text-hi">{profile.development.label}</p>
          <p className="mt-1 text-[13.5px] leading-snug text-mid">{profile.development.text}</p>

          {profile.recommendations.length ? (
            <>
              <h3 className="mt-5 font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase">Three things to work on</h3>
              <ol className="mt-3 space-y-2.5">
                {profile.recommendations.map((recommendation, index) => (
                  <li key={recommendation} className="flex gap-3">
                    <span className="tabular grid size-7 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[12.5px] text-mid">{index + 1}</span>
                    <span className="text-[14.5px] leading-relaxed text-hi">{recommendation}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>

        <p className="mt-6 text-[12.5px] leading-relaxed text-lo">
          This profile comes from what you did in one simulated shift. It is one input to a hiring decision, alongside
          an interview, and it is not a job offer or a rejection. Your attempt has been saved and you can close this page.
        </p>
      </main>
    </div>
  );
}
