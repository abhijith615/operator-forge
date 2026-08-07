"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader, PageShell } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { getCohortStanding, type CohortStanding } from "@/lib/genome/cohort";
import { useHistoryStore, weeklyStreak } from "@/stores/history-store";
import { useMissionHydrated } from "@/hooks/use-mission";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel sheen p-6">
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {label}
      </p>
      <div
        data-readout
        className="mt-3 text-[36px] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
      >
        {children ?? value}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-lo">{hint}</p>
    </div>
  );
}

export function StandingsView() {
  const hydrated = useMissionHydrated();
  const runs = useHistoryStore((state) => state.runs);
  const [cohort, setCohort] = React.useState<CohortStanding | null>(null);
  const [cohortChecked, setCohortChecked] = React.useState(false);

  const latest = runs[runs.length - 1];
  const previous = runs[runs.length - 2];
  const delta = latest && previous ? latest.rating - previous.rating : null;
  const streak = weeklyStreak(runs);

  React.useEffect(() => {
    if (!latest) return;
    let cancelled = false;
    void getCohortStanding(latest.rating)
      .then((result) => {
        if (!cancelled) setCohort(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCohortChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [latest]);

  if (!hydrated) return null;

  if (!latest) {
    return (
      <PageShell className="max-w-4xl">
        <PageHeader
          eyebrow="Standings"
          title="Leaderboard"
          description="Your rating, your movement, and where you sit against operators who ran the same hub."
        />
        <Reveal className="panel sheen mt-10 px-6 py-16 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-line-strong bg-obsidian">
            <Trophy className="size-5 text-lo" />
          </div>
          <h3 className="mt-6 text-[19px] font-medium tracking-[-0.02em] text-hi">
            You have not finished a shift yet
          </h3>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-mid">
            A rating comes from a completed run. Nothing here is populated until
            you have handed a hub over at least once.
          </p>
          <Button asChild variant="primary" size="md" className="mt-8">
            <Link href="/mission">
              Go to the briefing
              <ArrowRight />
            </Link>
          </Button>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        description="Ratings move when you run a shift better than you ran the last one. There are no badges and no way to grind it."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <Metric
            label="Operator rating"
            hint={`From ${latest.signature}, your most recent shift.`}
          >
            <CountUp to={latest.rating} duration={1.6} />
          </Metric>
        </Reveal>

        <Reveal delay={0.05}>
          <Metric
            label="Movement"
            hint={
              delta === null
                ? "Run a second shift to see whether you are improving."
                : "Against your previous run."
            }
          >
            {delta === null ? (
              <span className="text-lo">—</span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-2",
                  delta > 0 ? "text-ion-400" : delta < 0 ? "text-alert-500" : "text-lo",
                )}
              >
                {delta > 0 ? (
                  <TrendingUp className="size-6" />
                ) : delta < 0 ? (
                  <TrendingDown className="size-6" />
                ) : (
                  <Minus className="size-6" />
                )}
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </Metric>
        </Reveal>

        <Reveal delay={0.1}>
          <Metric
            label="Rank"
            hint={
              cohort
                ? `Of ${cohort.total} operators who ran this hub.`
                : cohortChecked
                  ? "Ranking needs other operators on this hub. There are none yet."
                  : "Checking the cohort…"
            }
          >
            {cohort ? (
              <span>
                {cohort.rank}
                <span className="text-[18px] text-lo"> / {cohort.total}</span>
              </span>
            ) : (
              <span className="text-lo">—</span>
            )}
          </Metric>
        </Reveal>

        <Reveal delay={0.15}>
          <Metric
            label="Weekly streak"
            hint={
              streak > 1
                ? "Consecutive calendar weeks with a completed shift."
                : "Run a shift next week to start a streak."
            }
          >
            <span className="inline-flex items-center gap-2">
              <Flame
                className={cn("size-6", streak > 1 ? "text-ember-500" : "text-faint")}
              />
              {streak}
            </span>
          </Metric>
        </Reveal>
      </div>

      {/* ── Run history ─────────────────────────────────────────────────── */}
      <Reveal className="mt-10">
        <h3 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
          Your shifts
        </h3>
        <p className="mt-2 text-[14px] text-mid">
          Every hub you have handed over, oldest first.
        </p>
      </Reveal>

      <div className="panel sheen mt-6 overflow-hidden">
        <ul className="divide-y divide-line">
          {runs.map((run, index) => {
            const before = runs[index - 1];
            const move = before ? run.rating - before.rating : null;
            return (
              <motion.li
                key={run.runId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: easing.outExpo }}
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-5 py-4"
              >
                <span
                  data-readout
                  className="font-mono text-[12px] text-faint tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-[14px] text-hi">{run.signature}</p>
                  <p className="truncate text-[11.5px] text-lo">
                    {new Date(run.completedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {run.tasksHandled} handled, {run.tasksExpired} expired · hub{" "}
                    {run.hubRating.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  {move !== null ? (
                    <span
                      className={cn(
                        "text-[12.5px] tabular-nums",
                        move > 0 ? "text-ion-400" : move < 0 ? "text-alert-500" : "text-lo",
                      )}
                    >
                      {move > 0 ? "+" : ""}
                      {move}
                    </span>
                  ) : null}
                  <span
                    data-readout
                    className="w-14 text-right text-[15px] font-medium text-hi tabular-nums"
                  >
                    {run.rating}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 text-[12.5px] leading-relaxed text-faint">
        {cohort
          ? "Rank is computed across every completed run of this mission."
          : "Ranking activates once more than one operator has completed this mission on a connected Supabase project. Until then there is no cohort, and a rank of one would mean nothing."}
      </p>
    </PageShell>
  );
}
