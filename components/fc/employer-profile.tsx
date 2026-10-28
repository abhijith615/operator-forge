import { TriangleAlert } from "lucide-react";

import type { FcResult } from "@/lib/fc/scoring";
import { FC_COMPETENCIES, FC_COMPETENCY_LABEL } from "@/lib/fc/weights";
import { formatWhatsapp } from "@/lib/hiring/phone";
import { cn } from "@/lib/utils";

/**
 * FC EXECUTIVE READINESS — what an employer (for now, an admin) reads.
 * Every score opens into what the candidate did to earn it.
 */

const eyebrow = "font-mono text-[11.5px] tracking-[0.18em] text-lo uppercase";
const card = "rounded-[20px] border border-line bg-surface p-5 sm:p-6";

function when(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

const bar = (score: number) => (score >= 70 ? "bg-ion-500" : score >= 45 ? "bg-ember-500" : "bg-warn-500");
const SCORE_TONE = ["text-alert-500", "text-warn-500", "text-mid", "text-ion-400"];

export function FcEmployerProfile({
  result,
  meta,
}: {
  result: FcResult;
  meta: { candidate: string; phone?: string | null; completedAt?: string | null; device?: string | null; session?: Record<string, number> };
}) {
  const session = meta.session ?? {};
  return (
    <div className="min-h-dvh bg-void text-hi">
      <main id="main" className="mx-auto max-w-4xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <section className={cn(card, "grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]")}>
          <div className="min-w-0">
            <p className={cn(eyebrow, "text-ember-500")}>Operator Forge · Hiring Test</p>
            <h1 className="mt-2 text-[clamp(1.6rem,5vw,2.3rem)] leading-[1.05] font-bold tracking-[-0.035em] text-hi uppercase">FC Executive readiness</h1>
            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-[14px] sm:grid-cols-3">
              {(
                [
                  ["Candidate", meta.candidate],
                  ["WhatsApp", meta.phone ? formatWhatsapp(meta.phone) : "—"],
                  ["Completed", when(meta.completedAt)],
                  ["Simulation", "30-minute inbound shift"],
                  ["Version", result.version],
                  ["Reached", `${result.observed} of ${result.opportunities} decision points`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={eyebrow}>{label}</dt>
                  <dd className="mt-0.5 font-medium break-words text-hi">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="tabular text-[76px] leading-[0.85] font-bold tracking-[-0.05em] text-hi sm:self-end">
            {result.overall}
            <span className="ml-1 text-[20px] font-semibold tracking-normal text-lo">/ 100</span>
          </p>
        </section>

        <section className={cn("mt-3 rounded-[20px] border p-5 sm:p-6", result.indication === "STRONG" ? "border-ion-500/40 bg-ion-500/[0.06]" : "border-line-strong bg-surface")}>
          <p className={eyebrow}>Hiring indication</p>
          <p className="mt-1.5 text-[19px] leading-tight font-bold text-hi uppercase sm:text-[22px]">{result.indicationLabel}</p>
          <p className="mt-2 text-[13.5px] leading-snug text-mid">A prompt for a person to decide. Nothing on this page rejects a candidate.</p>
        </section>

        {result.incomplete ? (
          <section className="mt-3 rounded-[20px] border border-warn-500/40 bg-warn-500/[0.07] p-5 sm:p-6">
            <p className="font-mono text-[12px] font-semibold tracking-[0.18em] text-warn-500 uppercase">Shift not completed</p>
            <p className="mt-2 text-[14px] leading-snug text-mid">Scores cover only the decision points reached. Nothing unreached counts against the candidate, and an unfinished shift cannot be indicated as Strong.</p>
          </section>
        ) : null}

        {result.flags.length ? (
          <section className="mt-3 rounded-[20px] border border-alert-500/45 bg-alert-500/[0.07] p-5 sm:p-6">
            <p className="flex items-center gap-2 font-mono text-[12px] font-semibold tracking-[0.18em] text-alert-500 uppercase">
              <TriangleAlert className="size-4" aria-hidden />
              Review flag{result.flags.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-3 space-y-3">
              {result.flags.map((flag) => (
                <li key={flag.id}>
                  <p className="text-[15.5px] font-semibold text-hi">{flag.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{flag.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={cn(card, "mt-3")}>
          <p className={eyebrow}>Five competencies · 20% each</p>
          <ul className="mt-4 space-y-4">
            {result.competencies.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-semibold text-hi">{c.label}</span>
                  <span className="tabular text-[17px] font-bold text-hi">{c.observed ? c.score : "—"}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/[0.07]">
                  <div className={cn("h-full rounded-full", bar(c.score))} style={{ width: `${c.observed ? c.score : 0}%` }} />
                </div>
                <p className="mt-1 text-[12px] text-lo">
                  {c.observed} of {c.opportunities} behaviours observed
                </p>
              </li>
            ))}
          </ul>
        </section>

        {result.probes.length ? (
          <section className={cn(card, "mt-3")}>
            <p className={eyebrow}>Interview probes · from where this candidate was weakest</p>
            <ul className="mt-4 space-y-4">
              {result.probes.map((probe) => (
                <li key={probe.area} className="border-l-2 border-ember-500 pl-3">
                  <p className="text-[12.5px] font-semibold tracking-[0.06em] text-ember-500 uppercase">{probe.area}</p>
                  <p className="mt-0.5 text-[13.5px] text-mid">Seen: {probe.seen}</p>
                  <p className="mt-1 text-[15px] leading-snug font-semibold text-hi">“{probe.ask}”</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6">
          <p className={eyebrow}>The evidence · 25 behaviours, each scored 0–3</p>
          {FC_COMPETENCIES.map((c) => (
            <div key={c} className={cn(card, "mt-3")}>
              <h2 className="text-[16px] font-semibold text-hi">{FC_COMPETENCY_LABEL[c]}</h2>
              <ul className="mt-3 divide-y divide-line">
                {result.evidence
                  .filter((e) => e.competency === c)
                  .map((e) => (
                    <li key={e.id} className="flex gap-3 py-2.5">
                      <span className="w-9 shrink-0 font-mono text-[12px] text-lo">{e.id}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-hi">{e.title}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-mid">{e.did}</p>
                      </div>
                      <span className={cn("tabular shrink-0 text-[15px] font-bold", e.reached ? SCORE_TONE[e.score] : "text-faint")}>
                        {e.reached ? `${e.score}/3` : "—"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        <section className={cn(card, "mt-3")}>
          <p className={eyebrow}>Session (logged, never scored)</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13.5px] sm:grid-cols-4">
            {[
              ["Device", meta.device ?? "—"],
              ["Left the tab", String(session.hidden ?? 0)],
              ["Lost connection", String(session.offline ?? 0)],
              ["Asked the assistant", String(session.assistant ?? 0)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-lo">{label}</dt>
                <dd className="font-semibold text-hi">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
