"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, ShieldCheck } from "lucide-react";

import { NodeMark } from "@/components/challenge/day-five/ui";
import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { CLOSING } from "@/lib/challenge/day-five/scenario";
import { logEvent } from "@/lib/challenge/telemetry";
import type { ChallengeResult } from "@/lib/challenge/types";
import { rupees } from "@/lib/challenge/day-two/ledger";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The Day 5 scorecard.
 *
 * It opens with the seven customer journeys, because those are the thing the
 * operator actually changed, and only then reads how. The unique metrics sit
 * above the competencies for the same reason: promise protection and customer
 * effort describe the evening better than a weighted average does.
 */
export function Day5Scorecard({ result }: { result: ChallengeResult }) {
  const reduced = useReducedMotion();
  const p = result.promise;

  React.useEffect(() => {
    logEvent("scorecard_viewed", { score: result.score, band: result.band }, 5);
  }, [result.score, result.band]);

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <section>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
            Protect the Promise · {p?.lockedByClock ? "Closed by the clock" : "Evening complete"}
          </p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-hi">Day 5 complete</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            Seven customers, every one of them technically fine. What you changed is what they ended up holding.
          </p>
        </section>

        {p ? (
          <section
            className={cn(
              "rounded-card border p-5",
              p.outcome.title === "PROMISES PROTECTED"
                ? "border-ion-500/40 bg-ion-500/[0.05]"
                : p.outcome.title === "PROMISES PARTLY HELD"
                  ? "border-warn-500/40 bg-warn-500/[0.04]"
                  : "border-alert-500/40 bg-alert-500/[0.04]",
            )}
          >
            <p
              className={cn(
                "font-mono text-[11px] tracking-[0.2em] uppercase",
                p.outcome.title === "PROMISES PROTECTED"
                  ? "text-ion-400"
                  : p.outcome.title === "PROMISES PARTLY HELD"
                    ? "text-warn-500"
                    : "text-alert-500",
              )}
            >
              {p.outcome.title}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              <Metric label="Promise protection" value={`${p.outcome.promiseProtection}`} suffix="/ 5" big />
              <Metric label="Customer effort" value={p.outcome.customerEffort} suffix={`${p.outcome.customerEffortScore}/100`} />
              <Metric label="Metric courage" value={`${p.outcome.metricCourage}%`} />
              <Metric label="Need vs transaction" value={`${p.outcome.needVsTransaction}%`} />
            </dl>
            <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[11px] text-faint">
              Cost of protecting them: +{p.outcome.ctdCost}s click-to-dispatch · {rupees(p.outcome.spend)}
              {p.outcome.wasteUnits > 0 ? ` · ${p.outcome.wasteUnits} units written off` : ""}
            </p>
          </section>
        ) : null}

        {/* ── The journeys ── */}
        {p ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">What each customer got</h2>
            <ul className="mt-3 space-y-2">
              {p.journeys.map((journey) => (
                <li
                  key={journey.id}
                  className={cn(
                    "rounded-card border p-3.5",
                    journey.state === "clear"
                      ? "border-ion-500/35 bg-ion-500/[0.04]"
                      : journey.state === "risk"
                        ? "border-warn-500/35 bg-warn-500/[0.04]"
                        : "border-alert-500/35 bg-alert-500/[0.04]",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <NodeMark state={journey.state} className="mt-1 size-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[13.5px] font-semibold text-hi">{journey.label}</span>
                        <span className="font-mono text-[10px] text-faint">{journey.customer}</span>
                      </p>
                      <p
                        className={cn(
                          "mt-1 font-mono text-[10.5px] tracking-[0.14em] uppercase",
                          journey.state === "clear"
                            ? "text-ion-400"
                            : journey.state === "risk"
                              ? "text-warn-500"
                              : "text-alert-500",
                        )}
                      >
                        {journey.headline}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-mid">{journey.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Customer-first judgement</p>
          <p data-readout className="mt-3 text-[56px] leading-none font-semibold tracking-[-0.05em] text-hi tabular-nums">
            <CountUp to={result.score} duration={reduced ? 0 : 1.4} />
            <span className="text-[22px] text-lo">/100</span>
          </p>
          <p className="mt-3 text-[14px] font-medium text-ember-400">{result.band}</p>
          <p className="mt-1 font-mono text-[11px] text-faint">Band range {result.bandRange}</p>
          <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
            A practice assessment from a simulated shift. Not an employment certification.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Judgement profile</h2>
          <ul className="mt-3 space-y-3.5">
            {result.competencies.map((entry, index) => (
              <li key={entry.dimension}>
                <div className="flex items-baseline gap-3">
                  <span className="text-[13.5px] font-medium text-hi">{entry.label}</span>
                  <span data-readout className="ml-auto font-mono text-[15px] font-semibold text-hi tabular-nums">
                    {entry.score}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={reduced ? { width: `${entry.score}%` } : { width: 0 }}
                    animate={{ width: `${entry.score}%` }}
                    transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.15 + index * 0.08, ease: easing.outExpo }}
                    className={cn(
                      "h-full rounded-full",
                      entry.score >= 80 ? "bg-ion-500" : entry.score >= 60 ? "bg-ember-500" : "bg-warn-500",
                    )}
                  />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-lo">{entry.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Promise dimensions ── */}
        {p ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Promise status</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["Usability", p.promise.usability],
                  ["Quality", p.promise.quality],
                  ["Safety", p.promise.safety],
                  ["Effort", p.promise.effort],
                  ["Trust", p.promise.trust],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-card border border-line bg-surface px-3 py-2.5">
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">{label}</dt>
                  <dd
                    data-readout
                    className={cn(
                      "mt-1 text-[20px] leading-none font-semibold tabular-nums",
                      value >= 85 ? "text-ion-400" : value >= 60 ? "text-warn-500" : "text-alert-500",
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Decision style</h2>
          <p className="mt-2 text-[20px] leading-tight font-semibold tracking-[-0.02em] text-hi">{result.signature.name}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{result.signature.blurb}</p>
        </section>

        {p && p.timeline.length > 0 ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Decision timeline</h2>
            <ol className="mt-3 space-y-2">
              {p.timeline.map((entry) => (
                <li key={`${entry.time}-${entry.text}`} className="flex items-start gap-3">
                  <span className="w-[64px] shrink-0 pt-0.5 font-mono text-[12px] text-faint tabular-nums">{entry.time}</span>
                  {entry.tone === "good" ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-ion-400" aria-label="Strong decision" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-500" aria-label="Weaker decision" />
                  )}
                  <span className="text-[13.5px] leading-relaxed text-hi">{entry.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {p?.bestCall ? (
          <section className="rounded-card border border-ion-500/35 bg-ion-500/[0.05] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ion-400 uppercase">Best call</p>
            <p className="mt-2 text-[15px] leading-relaxed text-hi">{p.bestCall.body}</p>
          </section>
        ) : null}

        {p ? (
          <section className="rounded-card border border-warn-500/35 bg-warn-500/[0.04] p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-warn-500 uppercase">Development area</p>
            <p className="mt-2 text-[14px] font-semibold text-hi uppercase">{p.developmentArea.area}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{p.developmentArea.body}</p>
          </section>
        ) : null}

        {/* ── Prevention ── */}
        {p ? (
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">Preventive controls</h2>
            <ul className="mt-3 space-y-1.5">
              {p.prevention.map((row) => (
                <li
                  key={row.incident}
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-card border border-line bg-surface px-3.5 py-2.5"
                >
                  <ShieldCheck
                    className={cn("size-3.5 shrink-0", row.fits ? "text-ion-400" : "text-faint")}
                    aria-hidden
                  />
                  <span className="text-[12.5px] text-hi">{row.incident}</span>
                  <span className="font-mono text-[10px] text-faint">→</span>
                  <span className={cn("text-[12px]", row.fits ? "text-ion-400" : "text-warn-500")}>
                    {row.control ?? "No control linked"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {p ? (
          <section className="rounded-card border border-line-strong bg-elevated p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">How you decide</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-hi">{p.insight}</p>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">If you ran this evening again</h2>
          <ol className="mt-3 space-y-2.5">
            {result.replay.map((line, index) => (
              <li key={line} className="flex gap-3 text-[13.5px] leading-relaxed text-mid">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-ember-500/40 font-mono text-[10.5px] text-ember-400">
                  {index + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">What you learned today</h2>
          <ul className="mt-3 space-y-3">
            {result.learned.map((item) => (
              <li key={item.title} className="rounded-card border border-line bg-surface p-3.5">
                <p className="text-[13.5px] font-semibold text-hi">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── The closing line ── */}
        <section className="rounded-card border border-ion-500/30 bg-ion-500/[0.04] p-6 text-center">
          <p className="text-[clamp(1.1rem,4vw,1.45rem)] leading-tight font-semibold tracking-[-0.02em] text-hi">
            {CLOSING.title}
          </p>
          <div className="mt-4 space-y-1">
            {CLOSING.lines.map((line) => (
              <p key={line} className="text-[15px] leading-snug text-ion-400">
                {line}
              </p>
            ))}
          </div>
        </section>

        <div className="space-y-2.5">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/challenge">
              Day 5 complete
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/challenge/leaderboard">See where you stand</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  big,
}: {
  label: string;
  value: string;
  suffix?: string;
  big?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span
          data-readout
          className={cn("font-semibold text-hi tabular-nums", big ? "text-[26px] leading-none" : "text-[18px] leading-none")}
        >
          {value}
        </span>
        {suffix ? <span className="font-mono text-[10.5px] text-faint">{suffix}</span> : null}
      </dd>
    </div>
  );
}
