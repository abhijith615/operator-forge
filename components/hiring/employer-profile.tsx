import { Download, TriangleAlert } from "lucide-react";

import { clockLabel } from "@/lib/hiring/model";
import type { AssessmentResult, EvidenceStrength } from "@/lib/hiring/scoring";
import type { EvidenceEvent, EvidenceType } from "@/lib/hiring/types";
import { COMPETENCIES, COMPETENCY_LABEL, assessmentWeights } from "@/lib/hiring/weights";
import { cn } from "@/lib/utils";

/**
 * DARK STORE MANAGER READINESS — what an employer reads.
 *
 * Built to be argued with. Every number on it opens into the moments it was
 * made from: when, what the store looked like, what the candidate did, what
 * that led to. A hiring manager who disagrees with a score can see exactly
 * which observation to disagree with, which is the only kind of score worth
 * putting in front of one.
 */

export interface ProfileMeta {
  candidate: string;
  role: string;
  form: string;
  version: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status?: string;
  device?: string | null;
  /** Counts of what the browser session did. Logged, never scored. */
  session?: Record<string, number>;
  sample?: boolean;
  /** The two-page plain-English PDF of this profile, when there is one to download. */
  pdfHref?: string;
}

const eyebrow = "font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase";
const card = "rounded-[20px] border border-line bg-surface p-5 sm:p-6";

const STRENGTH_TONE: Record<EvidenceStrength, string> = {
  "STRONG EVIDENCE": "border-ion-500/40 text-ion-400",
  "MODERATE EVIDENCE": "border-line-bright text-mid",
  "LIMITED EVIDENCE": "border-warn-500/40 text-warn-500",
};

const TYPE_TONE: Record<EvidenceType, string> = {
  DEMONSTRATED: "border-ion-500/40 bg-ion-500/[0.08] text-ion-400",
  PARTIAL: "border-ember-500/40 bg-ember-500/[0.08] text-ember-400",
  VERBAL: "border-line-bright text-mid",
  NOT_SHOWN: "border-line-bright text-mid",
  COUNTER_EVIDENCE: "border-alert-500/40 bg-alert-500/[0.08] text-alert-500",
};

const RATING_TONE: Record<string, string> = {
  Strong: "text-ion-400",
  Mixed: "text-ember-400",
  Exposed: "text-warn-500",
  Weak: "text-warn-500",
  "Manager-dependent": "text-warn-500",
};

function when(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function bar(score: number): string {
  return score >= 70 ? "bg-ion-500" : score >= 45 ? "bg-ember-500" : "bg-warn-500";
}

function EvidenceCard({ event }: { event: EvidenceEvent }) {
  const missed = event.behaviourTags.includes("not_reached");
  const row = (label: string, text: string) => (
    <div className="grid gap-0.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="font-mono text-[11px] tracking-[0.14em] text-lo uppercase sm:pt-0.5">{label}</dt>
      <dd className="text-[14px] leading-snug text-hi">{text}</dd>
    </div>
  );
  return (
    <article className="rounded-[16px] border border-line bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h4 className="text-[15.5px] leading-snug font-semibold text-hi uppercase">{event.title}</h4>
          <p className="mt-0.5 text-[12.5px] text-lo">
            {event.simTime !== null ? `${clockLabel(event.simTime)} · ` : ""}
            {event.claim}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.12em]", TYPE_TONE[event.evidenceType])}>
            {event.evidenceType.replace("_", " ")}
          </span>
          <span className="tabular text-[15px] font-semibold text-hi">
            {event.score}
            <span className="text-lo"> / 3</span>
          </span>
        </div>
      </header>
      {!missed ? (
        <dl className="mt-3 space-y-2.5 border-t border-line pt-3">
          {row("State", event.stateBefore)}
          {row("Candidate", event.candidateAction)}
          {row("Result", event.stateAfter)}
          {event.laterConsequence ? row("Later", event.laterConsequence) : null}
          {row("Timing", event.timingContext)}
          {row("Behaviour", event.behaviourTags.map((tag) => tag.replace(/_/g, " ")).join(", "))}
        </dl>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-[13.5px] text-mid">{event.stateBefore}</p>
      )}
    </article>
  );
}

export function EmployerProfile({ result, meta }: { result: AssessmentResult; meta: ProfileMeta }) {
  const strong = result.indication.startsWith("STRONG");
  const session = meta.session ?? {};
  const sessionRows: [string, number][] = [
    ["Left the tab", session.hidden ?? 0],
    ["Lost connection", session.offline ?? 0],
    ["Resumed after a reload", session.resume ?? 0],
    ["Asked the assistant", session.assistant ?? 0],
  ];

  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-4xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {meta.sample ? (
          <p className="mb-5 rounded-[14px] border border-ember-500/35 bg-ember-500/[0.07] px-4 py-3 text-[13.5px] leading-snug text-hi">
            <span className="font-semibold">Sample profile.</span> This is a simulated candidate, not a real person. The
            shift was run through the live engine and scored by the same rules as a real attempt, so everything on this
            page is exactly what the product produces.
          </p>
        ) : null}

        {/* ── Headline ─────────────────────────────────────────────────── */}
        <section className={cn(card, "grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]")}>
          <div className="min-w-0">
            <p className={cn(eyebrow, "text-ember-500")}>Operator Forge · Hiring Test</p>
            <h1 className="mt-2 text-[clamp(1.6rem,5vw,2.3rem)] leading-[1.05] font-bold tracking-[-0.035em] text-hi uppercase">
              Dark store manager readiness
            </h1>
            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-[14px] sm:grid-cols-3">
              {(
                [
                  ["Candidate", meta.candidate],
                  ["Role", meta.role],
                  ["Simulation", "30-minute work sample"],
                  ["Version", `${meta.version} · Form ${meta.form}`],
                  ["Completed", when(meta.completedAt)],
                  ["Shift ended", result.outcomeTitle],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={eyebrow}>{label}</dt>
                  <dd className="mt-0.5 font-medium break-words text-hi">{value}</dd>
                </div>
              ))}
            </dl>
            {meta.pdfHref ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <a
                  href={meta.pdfHref}
                  download
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ember-500 px-4 py-2 text-[13.5px] font-semibold text-void transition-colors hover:bg-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void focus-visible:outline-none"
                >
                  <Download className="size-4" aria-hidden />
                  Download 2-page PDF
                </a>
                <span className="text-[12.5px] text-lo">A plain-English summary for hiring managers, with interview questions.</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-end gap-2 sm:flex-col sm:items-end sm:justify-between">
            <p className="tabular text-[76px] leading-[0.85] font-bold tracking-[-0.05em] text-hi">
              {result.overall}
              <span className="ml-1 text-[20px] font-semibold tracking-normal text-lo">/ 100</span>
            </p>
            {result.incomplete ? (
              <p className="text-[12.5px] leading-snug text-lo sm:text-right">
                {result.reachedOverall} on the {result.observed} moments reached
              </p>
            ) : null}
          </div>
        </section>

        <section className={cn("mt-3 rounded-[20px] border p-5 sm:p-6", strong ? "border-ion-500/40 bg-ion-500/[0.06]" : "border-line-strong bg-surface")}>
          <p className={eyebrow}>Hiring indication</p>
          <p className="mt-1.5 text-[19px] leading-tight font-bold tracking-[-0.01em] text-hi sm:text-[22px]">{result.indication}</p>
          <p className="mt-2 text-[13.5px] leading-snug text-mid">
            {result.signature.blurb} An indication is a prompt for a person to decide. Nothing on this page rejects a
            candidate.
          </p>
        </section>

        {result.incomplete ? (
          <section className="mt-3 rounded-[20px] border border-warn-500/40 bg-warn-500/[0.07] p-5 sm:p-6" aria-label="Shift not completed">
            <p className="font-mono text-[12px] font-semibold tracking-[0.18em] text-warn-500 uppercase">Shift not completed</p>
            <p className="mt-2 text-[15.5px] font-semibold text-hi">
              {result.observed} of {result.opportunities} assessed moments were reached before the time ended.
            </p>
            <p className="mt-1 text-[13.5px] leading-snug text-mid">
              The overall score is out of the whole shift: moments not reached count as zero, so everybody is measured
              against the same thirty minutes. On the moments they did reach, they scored {result.reachedOverall}. Each
              competency below is scored on the moments reached, and an unfinished shift cannot be indicated as “Strong
              evidence”. Read each score with its “moments observed” count beside it.
            </p>
          </section>
        ) : null}

        {result.flags.length ? (
          <section className="mt-3 rounded-[20px] border border-alert-500/45 bg-alert-500/[0.07] p-5 sm:p-6" aria-label="Manual review flags">
            <p className="flex items-center gap-2 font-mono text-[12px] font-semibold tracking-[0.18em] text-alert-500 uppercase">
              <TriangleAlert className="size-4" aria-hidden />
              Manual review flag{result.flags.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-3 space-y-3">
              {result.flags.map((flag) => (
                <li key={flag.id}>
                  <p className="text-[15.5px] font-semibold text-hi">{flag.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{flag.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12.5px] leading-snug text-lo">A flag asks a person to look. It does not change the score and does not reject the candidate.</p>
          </section>
        ) : null}

        {/* ── Five competencies ────────────────────────────────────────── */}
        <section className={cn(card, "mt-3")}>
          <h2 className={eyebrow}>Five competencies</h2>
          <ol className="mt-4 space-y-5">
            {result.competencies.map((competency, index) => (
              <li key={competency.id}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tabular font-mono text-[13px] text-lo">{index + 1}</span>
                  <a href={`#${competency.id}`} className="text-[16px] font-semibold text-hi uppercase underline-offset-4 hover:underline">
                    {competency.label}
                  </a>
                  <span className="text-[12.5px] text-lo">weight {Math.round(competency.weight * 100)}%</span>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.12em] uppercase", STRENGTH_TONE[competency.strength])}>
                    {competency.strength.replace(" EVIDENCE", "")} evidence
                  </span>
                  <span className={cn("tabular ml-auto leading-none font-bold", competency.observed ? "text-[24px] text-hi" : "text-[15px] text-lo")}>
                    {competency.observed ? competency.score : "Not observed"}
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 rounded-full bg-white/[0.07]"
                  role="img"
                  aria-label={competency.observed ? `${competency.label} ${competency.score} out of 100` : `${competency.label} not observed`}
                >
                  {competency.observed ? <div className={cn("h-full rounded-full", bar(competency.score))} style={{ width: `${competency.score}%` }} /> : null}
                </div>
                <p className={cn("mt-1.5 text-[12.5px]", competency.observed < competency.opportunities ? "text-warn-500" : "text-lo")}>
                  {competency.observed
                    ? `${competency.decisions} of ${competency.decisionsTotal} decisions · ${competency.observed} of ${competency.opportunities} behaviours observed`
                    : `None of the ${competency.opportunities} moments was reached`}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Team ─────────────────────────────────────────────────────── */}
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className={card}>
            <h2 className={cn(eyebrow, "text-ember-500")}>Team effect</h2>
            <dl className="mt-3 divide-y divide-line">
              {result.teamEffect.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[14px] text-mid">{row.label}</dt>
                  <dd className="tabular text-right text-[14.5px] font-semibold text-hi">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={card}>
            <h2 className={eyebrow}>Team management, in detail</h2>
            <ul className="mt-4 space-y-3">
              {result.teamSubscores.map((sub) => (
                <li key={sub.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] text-hi">{sub.label}</span>
                    <span className={cn("tabular text-[14px] font-semibold", sub.observed ? "text-hi" : "text-lo")}>
                      {!sub.observed ? "Not observed" : sub.note ? `${sub.note} · ${sub.score}` : sub.score}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.07]">
                    {sub.observed ? <div className={cn("h-full rounded-full", bar(sub.score))} style={{ width: `${sub.score}%` }} /> : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12.5px] leading-snug text-lo">
              Manager dependency: how much of the shift ran on the candidate’s own hands while a trained associate was
              free. A high score here means low dependency.
            </p>
          </section>
        </div>

        {/* ── Across the shift ─────────────────────────────────────────── */}
        {result.crossScenario.length ? (
          <section className={cn(card, "mt-3")}>
            <h2 className={cn(eyebrow, "text-ember-500")}>Cross-scenario evidence</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-mid">What an early decision did to a later one. No single moment shows this.</p>
            <ul className="mt-4 space-y-4">
              {result.crossScenario.map((item) => (
                <li key={item.title} className="border-l-2 border-line-bright pl-4">
                  <p className="text-[15.5px] font-semibold text-hi uppercase">
                    {item.title} — <span className={RATING_TONE[item.rating] ?? "text-mid"}>{item.rating}</span>
                  </p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-mid">{item.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Probes ───────────────────────────────────────────────────── */}
        {result.probes.length ? (
          <section className={cn(card, "mt-3")}>
            <h2 className={cn(eyebrow, "text-ember-500")}>Interview probes</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-mid">Each comes from something this candidate did in the shift.</p>
            <ol className="mt-4 space-y-5">
              {result.probes.map((probe) => (
                <li key={probe.area}>
                  <p className="font-mono text-[12px] font-semibold tracking-[0.16em] text-hi uppercase">{probe.area}</p>
                  <p className="mt-1.5 text-[14px] leading-snug text-mid">“{probe.evidence}”</p>
                  <p className="mt-2 text-[12px] tracking-[0.14em] text-lo uppercase">Probe</p>
                  <p className="mt-0.5 text-[15.5px] leading-snug font-medium text-hi">“{probe.probe}”</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* ── Evidence ─────────────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className={cn(eyebrow, "text-ember-500")}>Behavioural evidence</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-mid">
            Thirty-four behaviours, read from twenty-one decisions. Each behaviour scores 0 to 3. A decision is scored
            once, as the share of its behaviours’ points earned, and a competency is the average of its decisions — so
            one decision cannot count several times.
          </p>
          <div className="mt-4 space-y-3">
            {COMPETENCIES.map((id) => {
              const events = result.evidence.filter((event) => event.competencyId === id);
              const competency = result.competencies.find((entry) => entry.id === id)!;
              return (
                <details key={id} id={id} className={cn(card, "group scroll-mt-6 p-0 sm:p-0")} open={competency.weight >= 0.3}>
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="text-[16px] font-semibold text-hi uppercase">{COMPETENCY_LABEL[id]}</span>
                    <span className="tabular text-[13.5px] text-mid">
                      {competency.observed ? competency.score : "Not observed"} · {competency.decisionsTotal} decisions
                      <span className="ml-2 text-lo group-open:hidden">Show</span>
                      <span className="ml-2 hidden text-lo group-open:inline">Hide</span>
                    </span>
                  </summary>
                  <div className="space-y-5 px-3 pb-4 sm:px-5">
                    {result.decisions
                      .filter((decision) => decision.competencyId === id)
                      .map((decision) => (
                        <section key={decision.id} aria-label={decision.label}>
                          <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
                            <h3 className="font-mono text-[12px] tracking-[0.14em] text-mid uppercase">{decision.label}</h3>
                            <span className="tabular shrink-0 text-[13.5px] font-semibold text-hi">
                              {decision.observed ? decision.score : "Not reached"}
                            </span>
                          </div>
                          <div className="space-y-2.5">
                            {events
                              .filter((event) => decision.behaviours.includes(event.behaviourId))
                              .map((event) => (
                                <EvidenceCard key={event.behaviourId} event={event} />
                              ))}
                          </div>
                        </section>
                      ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* ── How to read this ─────────────────────────────────────────── */}
        <section className={cn(card, "mt-8")}>
          <h2 className={eyebrow}>How this was produced</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-mid">
            <li>
              Overall readiness is{" "}
              {COMPETENCIES.map((id) => `${COMPETENCY_LABEL[id]} × ${assessmentWeights[id].toFixed(2)}`).join(" + ")}. The
              weights are a provisional judgement by subject-matter experts, not yet validated against job performance.
            </li>
            <li>Every score is assigned by fixed rules from what the candidate did in the simulated store. No AI assigns, adjusts or overrides a score or a flag.</li>
            <li>Timing is operational — before or after a queue breached — never how fast somebody tapped. Language, typing speed and device are not scored.</li>
            <li>Evidence strength reflects how many moments were observed and how consistently they pointed the same way. It is not a statistical confidence interval; there is not yet the data to support one.</li>
            <li>Several behaviours can be read from one decision. They are scored together as that decision, once, and a competency is the average of its decisions. A decision can still be evidence for two different competencies where it shows two different things — the nil pick shows inventory discipline and whether the customer got a complete order.</li>
            <li>The overall score is out of the whole shift. If the time ends first, moments not reached count as zero in it, so finishing within the same thirty minutes as everybody else counts; the score on the moments reached is shown beside it. Each competency is scored on the moments reached, and the indication is capped as well: never “Strong” on an unfinished shift, and “Additional assessment” when under half of it was reached.</li>
            <li>This is a work sample from one thirty-minute shift. Use it alongside an interview, not instead of one.</li>
          </ul>
          {!meta.sample ? (
            <>
              <h3 className={cn(eyebrow, "mt-5")}>Session</h3>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
                <div>
                  <dt className="inline text-lo">Started </dt>
                  <dd className="inline text-hi">{when(meta.startedAt)}</dd>
                </div>
                <div>
                  <dt className="inline text-lo">Device </dt>
                  <dd className="inline text-hi">{meta.device ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-lo">Status </dt>
                  <dd className="inline text-hi">{meta.status === "expired" ? "ran out of time" : meta.status === "in_progress" ? "in progress" : "completed"}</dd>
                </div>
                {sessionRows.map(([label, count]) => (
                  <div key={label}>
                    <dt className="inline text-lo">{label} </dt>
                    <dd className="tabular inline text-hi">{count}×</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[12.5px] text-lo">Session events are logged for context. They are not scored and do not invalidate an attempt.</p>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
