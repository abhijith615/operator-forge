"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Download, Fingerprint, Lock } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/challenge/telemetry";
import type { MainSkill, OperatorProfile, SubSkill } from "@/lib/challenge/day-six/profile";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Day 6 · the Operator Profile.
 *
 * Read by two people. The operator wants to know what they are like; whoever
 * is thinking about hiring them wants to know whether to put them in front of
 * a store. The second is the harder reader, and the layout is built for them:
 * five competencies, each with the score large enough to scan and two or
 * three lines underneath that explain what produced it.
 *
 * A number on its own is not evidence. "Team Management: 74" tells a hiring
 * manager nothing they can act on — "averaged 74, from 61 on Day 1 to 84 on
 * Day 3, and held 81 on the day built to stress it" does.
 */

/** Five marks along a rail. No percentage, and the rail is the same everywhere. */
function Rail({ score, className }: { score: number | null; className?: string }) {
  const filled = score === null ? 0 : Math.max(1, Math.round((score / 100) * 5));
  return (
    <div className={cn("flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1 w-6 rounded-full",
            score === null ? "bg-white/[0.07]" : step < filled ? "bg-ember-500" : "bg-white/[0.09]",
          )}
        />
      ))}
    </div>
  );
}

function MainSkillCard({ skill, index }: { skill: MainSkill; index: number }) {
  const unread = skill.score === null;
  return (
    <li className="rounded-panel border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
        <span className="pt-1 font-mono text-[12.5px] text-faint tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <h3
          className={cn(
            "min-w-[12rem] flex-1 text-[17px] leading-snug font-medium tracking-[-0.01em]",
            unread ? "text-lo" : "text-hi",
          )}
        >
          {skill.name}
        </h3>

        <div className="flex shrink-0 items-center gap-3.5">
          <Rail score={skill.score} />
          <span
            data-readout
            className={cn(
              "w-11 text-right font-mono text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
              unread ? "text-faint" : "text-hi",
            )}
          >
            {unread ? "—" : skill.score}
          </span>
        </div>
      </div>

      {/* The evidence. This is the part a reader who was not there needs. */}
      <ul className="mt-4 space-y-2 border-t border-line pt-4">
        {skill.evidence.map((line, lineIndex) => (
          <li key={lineIndex} className="flex gap-2.5">
            <span
              className={cn(
                "mt-[0.55rem] size-1 shrink-0 rounded-full",
                lineIndex === skill.evidence.length - 1 ? "bg-ember-500" : "bg-line-bright",
              )}
              aria-hidden
            />
            <p
              className={cn(
                "text-[13.5px] leading-relaxed",
                lineIndex === skill.evidence.length - 1 ? "text-hi" : "text-mid",
              )}
            >
              {line}
            </p>
          </li>
        ))}
      </ul>
    </li>
  );
}

function SubSkillRow({ skill }: { skill: SubSkill }) {
  const unread = skill.score === null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-5 py-3.5 first:border-t-0">
      <span className={cn("w-[10.5rem] text-[13.5px] font-medium", unread ? "text-lo" : "text-hi")}>
        {skill.name}
      </span>
      <p className="min-w-[12rem] flex-1 text-[13px] leading-relaxed text-mid">{skill.line}</p>
      <div className="flex shrink-0 items-center gap-3">
        <Rail score={skill.score} />
        <span
          data-readout
          className={cn(
            "w-8 text-right font-mono text-[14px] tabular-nums",
            unread ? "text-faint" : "text-hi",
          )}
        >
          {unread ? "—" : skill.score}
        </span>
      </div>
    </li>
  );
}

export function OperatorProfileView({
  profile,
  firstName,
}: {
  profile: OperatorProfile;
  firstName: string;
}) {
  const reduced = useReducedMotion();
  const complete = profile.daysDone >= 5;

  React.useEffect(() => {
    logEvent("profile_viewed", { daysDone: profile.daysDone, overall: profile.overall }, 6);
  }, [profile.daysDone, profile.overall]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: easing.outExpo },
        };

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.section {...rise(0)}>
          <p className="flex items-center gap-2 font-mono text-[13px] tracking-[0.2em] text-ember-500 uppercase">
            <Fingerprint className="size-4" aria-hidden />
            Day 6 · Operator Profile
          </p>
          <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.03em] text-hi">
            {firstName}, this is how you operate.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            {complete
              ? "Five simulations, read together. A scorecard judges one morning; this is what was true across all of them — and it is written so somebody who was not there can read it."
              : `You have played ${profile.daysDone} of five. The readings below use what exists; the rest fill in as you finish the week.`}
          </p>
        </motion.section>

        {/* ── Signature and overall ───────────────────────────────────── */}
        <motion.section {...rise(0.08)} className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <div className="rounded-panel border border-ember-500/30 bg-ember-500/[0.05] p-5">
            <p className="font-mono text-[12px] tracking-[0.16em] text-ember-400 uppercase">
              Operator signature
            </p>
            <p className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi">
              {profile.signature.name}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-mid">{profile.signature.blurb}</p>
          </div>

          <div className="rounded-panel border border-line bg-surface p-5">
            <p className="font-mono text-[12px] tracking-[0.16em] text-faint uppercase">
              Week average
            </p>
            <p
              data-readout
              className="mt-2 text-[40px] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
            >
              {profile.overall === null ? "—" : <CountUp to={profile.overall} />}
            </p>
            {profile.band ? (
              <>
                <p className="mt-2 text-[14px] font-medium text-hi">{profile.band}</p>
                <p className="mt-0.5 font-mono text-[12.5px] text-faint">{profile.bandRange}</p>
              </>
            ) : null}
          </div>
        </motion.section>

        {/* ── The five ────────────────────────────────────────────────── */}
        <motion.section {...rise(0.16)}>
          <h2 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
            The five operating skills
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mid">
            Each day scores the skills it was built around, and every one of them rolls up
            into these five. A skill a day did not test is left out of that day rather than
            counted as zero. The lines under each score say where the number came from and
            what it means in a store.
          </p>

          <ul className="mt-5 space-y-3">
            {profile.main.map((skill, index) => (
              <MainSkillCard key={skill.dimension} skill={skill} index={index} />
            ))}
          </ul>
        </motion.section>

        {/* ── The subset ──────────────────────────────────────────────── */}
        <motion.section {...rise(0.24)}>
          <h2 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
            Also observed
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mid">
            Not competencies — habits. None of these can be read from a single run, which
            is the only reason they are here.
          </p>

          <ul className="mt-5 overflow-hidden rounded-panel border border-line bg-surface">
            {profile.subset.map((skill) => (
              <SubSkillRow key={skill.id} skill={skill} />
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-lo">
            <span>
              <span className="text-faint">Decisions recorded</span>{" "}
              <span data-readout className="font-mono text-hi tabular-nums">
                {profile.decisionsTaken}
              </span>
            </span>
            <span>
              <span className="text-faint">SOP breaches</span>{" "}
              <span data-readout className="font-mono text-hi tabular-nums">
                {profile.sopViolations}
              </span>
            </span>
          </div>
        </motion.section>

        {/* ── The five days ───────────────────────────────────────────── */}
        <motion.section {...rise(0.32)}>
          <h2 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
            Where it came from
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            Every number above is built from these five. Open any of them for the decisions
            behind it.
          </p>

          <ul className="mt-5 space-y-2">
            {profile.days.map((day) => (
              <li key={day.day}>
                {day.done ? (
                  <Link
                    href={`/challenge/day-${day.day}/scorecard`}
                    className={cn(
                      "flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3.5",
                      "transition-colors hover:border-line-bright hover:bg-elevated",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    )}
                  >
                    <span className="font-mono text-[12px] tracking-[0.14em] text-ember-500 uppercase">
                      Day {day.day}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-hi">
                        {day.title}
                      </span>
                      <span className="block text-[13px] text-lo">{day.band}</span>
                    </span>
                    <span
                      data-readout
                      className="font-mono text-[16px] font-semibold text-hi tabular-nums"
                    >
                      {day.score}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden />
                  </Link>
                ) : (
                  <Link
                    href={`/challenge/day-${day.day}`}
                    className={cn(
                      "flex items-center gap-4 rounded-card border border-dashed border-line bg-surface/50 px-4 py-3.5",
                      "transition-colors hover:border-line-bright",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    )}
                  >
                    <span className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">
                      Day {day.day}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-lo">
                        {day.title}
                      </span>
                      <span className="block text-[13px] text-faint">Not played yet</span>
                    </span>
                    <Lock className="size-3.5 shrink-0 text-faint" aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ── Download ────────────────────────────────────────────────── */}
        <motion.section
          {...rise(0.4)}
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-surface p-5"
        >
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-hi">Keep your profile</p>
            <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-mid">
              One page with your five skills, the evidence behind each, and your week
              average. Yours to send to anyone.
            </p>
          </div>
          <Button asChild variant="primary" size="md">
            <a href="/challenge/day-6/download" download>
              <Download />
              Download
            </a>
          </Button>
        </motion.section>

        <p className="text-[12.5px] leading-relaxed text-faint">
          Built from your own runs — every decision, how long you took over it, and what was
          waiting behind it. None of it was visible to you during the simulations.
        </p>
      </main>
    </div>
  );
}
