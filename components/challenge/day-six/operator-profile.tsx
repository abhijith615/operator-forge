"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Download, Fingerprint, Lock } from "lucide-react";

import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/challenge/telemetry";
import type { OperatorProfile, SkillReading } from "@/lib/challenge/day-six/profile";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Day 6 · the Operator Profile.
 *
 * Five days of scorecards, read at once. The order is deliberate: the
 * signature first because it is the sentence somebody repeats about
 * themselves, then the ten readings because that is the substance, then the
 * five days so the evidence is one click away from every claim.
 *
 * Every skill carries where its number came from. A profile that says "Range:
 * 61" and nothing else is a horoscope with a decimal point.
 */

/** Five marks along a rail, no percentage. The rail is the same for every skill. */
function Rail({ score }: { score: number | null }) {
  const filled = score === null ? 0 : Math.max(1, Math.round((score / 100) * 5));
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1 w-5 rounded-full",
            score === null
              ? "bg-white/[0.07]"
              : step < filled
                ? "bg-ember-500"
                : "bg-white/[0.09]",
          )}
        />
      ))}
    </div>
  );
}

function SkillRow({ skill, index }: { skill: SkillReading; index: number }) {
  const unread = skill.score === null;
  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
        <span className="w-6 shrink-0 pt-0.5 font-mono text-[12px] text-faint tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-[14rem] flex-1">
          <p className={cn("text-[14.5px] font-medium", unread ? "text-lo" : "text-hi")}>
            {skill.name}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mid">{skill.line}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-faint">{skill.source}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          <Rail score={skill.score} />
          <span
            data-readout
            className={cn(
              "w-10 text-right font-mono text-[14px] tabular-nums",
              unread ? "text-faint" : "text-hi",
            )}
          >
            {unread ? "—" : skill.score}
          </span>
        </div>
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
              ? "Five simulations, read together. A scorecard judges one morning; this is the part that was true on all of them."
              : `You have played ${profile.daysDone} of five. The readings below use what exists — the rest fill in as you finish the week.`}
          </p>
        </motion.section>

        {/* ── Signature and overall ───────────────────────────────────── */}
        <motion.section
          {...rise(0.08)}
          className="grid gap-3 sm:grid-cols-[1.4fr_1fr]"
        >
          <div className="rounded-panel border border-ember-500/30 bg-ember-500/[0.05] p-5">
            <p className="font-mono text-[12px] tracking-[0.16em] text-ember-400 uppercase">
              Your signature
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

        {/* ── The ten readings ────────────────────────────────────────── */}
        <motion.section {...rise(0.16)}>
          <h2 className="text-[19px] font-medium tracking-[-0.02em] text-hi">Your ten skills</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            Five come from what each day scores you against. The other five only exist
            across days — nothing in a single run can tell you whether you are
            consistent, or whether you got better.
          </p>

          <ul className="mt-5 overflow-hidden rounded-panel border border-line bg-surface">
            {profile.skills.map((skill, index) => (
              <SkillRow key={skill.id} skill={skill} index={index} />
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
        <motion.section {...rise(0.24)}>
          <h2 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
            Where it came from
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mid">
            Every reading above is built from these five. Open any of them for the
            decisions behind the number.
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
          {...rise(0.32)}
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-surface p-5"
        >
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-hi">Keep your profile</p>
            <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-mid">
              A single image with your signature, your week average and all ten
              readings. Yours to put wherever you like.
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
          Built from your own runs — every decision, how long you took over it, and
          what was waiting behind it. None of it was visible to you during the
          simulations.
        </p>
      </main>
    </div>
  );
}
