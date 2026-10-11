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
export function CandidateProfile({ profile, email }: { profile: Profile; email: string }) {
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:pt-14">
        <p className="font-mono text-[11.5px] tracking-[0.2em] text-ember-500 uppercase">Operator Forge · Hiring Test</p>
        <h1 className="mt-2 text-[clamp(1.9rem,7vw,2.8rem)] leading-[1.03] font-bold tracking-[-0.04em] text-hi">
          Your dark store manager profile
        </h1>
        <p className="mt-2 text-[14px] break-all text-lo">{email}</p>

        {profile.timedOut ? (
          <p className="mt-4 rounded-[14px] border border-line-strong bg-white/[0.03] px-3.5 py-3 text-[13.5px] leading-snug text-mid">
            The thirty minutes ran out before the shift did. This profile is built from the decisions you had made.
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
                  <span className="text-[14.5px] font-medium text-hi">{competency.label}</span>
                  <span className="tabular text-[15px] font-semibold text-hi">{competency.score}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07]" role="img" aria-label={`${competency.label} ${competency.score} out of 100`}>
                  <div className={cn("h-full rounded-full", competency.score >= 70 ? "bg-ion-500" : competency.score >= 45 ? "bg-ember-500" : "bg-warn-500")} style={{ width: `${competency.score}%` }} />
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
