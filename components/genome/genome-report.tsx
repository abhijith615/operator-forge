"use client";

import { motion } from "framer-motion";
import { Dna, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { AchievementStrip } from "@/components/mission/achievements";
import { CapabilityPanel } from "@/components/genome/capability-panel";
import { GenomeRadar } from "@/components/genome/genome-radar";
import { Reflection } from "@/components/genome/reflection";
import { Replay } from "@/components/genome/replay";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { PageShell } from "@/components/shell/page-header";
import { capabilities } from "@/lib/constants/site";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { OperatorGenome } from "@/types/genome";

function nameOf(id: string): string {
  return capabilities.find((capability) => capability.id === id)?.name ?? id;
}

export function GenomeReport({
  genome,
  firstName,
}: {
  genome: OperatorGenome;
  firstName: string;
}) {
  const stats = [
    { label: "Tasks handled", value: String(genome.stats.tasksHandled) },
    { label: "Let expire", value: String(genome.stats.tasksExpired) },
    { label: "Median decision", value: `${genome.stats.medianLatency}s` },
    { label: "Peak board", value: String(genome.stats.peakQueue) },
    { label: "Messages sent", value: String(genome.stats.promptsSent) },
    { label: "Terms looked up", value: String(genome.stats.termsOpened) },
    { label: "Rating at close", value: genome.stats.ratingAtClose.toFixed(2) },
    { label: "Panels opened", value: String(genome.stats.panelsVisited) },
  ];

  return (
    <PageShell className="max-w-6xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing.outExpo }}
      >
        <div className="flex items-center gap-2.5">
          <Dna className="size-3.5 text-ember-500" />
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
            Operator Genome · The First Shift
          </span>
        </div>

        <h2 className="mt-4 text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-gradient">
          {firstName}, this is how you operated.
        </h2>

        <p className="mt-5 max-w-3xl text-[15.5px] leading-relaxed text-mid">
          {genome.summary}
        </p>
      </motion.div>

      {/* ── Signature + rating ──────────────────────────────────────────── */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Reveal className="panel sheen grain relative overflow-hidden p-6">
          <span className="absolute -top-20 left-1/3 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,106,43,0.2),transparent_70%)] blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-ember-500">
              <Sparkles className="size-3.5" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
                Your signature
              </span>
            </div>
            <p className="mt-4 text-[30px] leading-none font-semibold tracking-[-0.035em] text-hi">
              {genome.signature}
            </p>
            <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-mid">
              {genome.signatureBlurb}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.06} className="panel sheen flex flex-col justify-between p-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              Operator rating
            </p>
            <p
              data-readout
              className="mt-3 text-[46px] leading-none font-semibold tracking-[-0.045em] text-hi tabular-nums"
            >
              <CountUp to={genome.rating} duration={1.8} />
            </p>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-lo">
            A composite of the ten readings, weighted by what you were carrying at
            the time. It is not a mark out of anything.
          </p>
        </Reveal>
      </div>

      {/* ── Radar ───────────────────────────────────────────────────────── */}
      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <GenomeRadar readings={genome.capabilities} />
        </Reveal>

        <div className="grid gap-5">
          <Reveal delay={0.06} className="panel sheen p-6">
            <div className="flex items-center gap-2 text-ion-400">
              <TrendingUp className="size-3.5" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
                Strongest this shift
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {genome.strengths.map((id) => (
                <li key={id} className="text-[14.5px] text-hi">
                  {nameOf(id)}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12} className="panel sheen p-6">
            <div className="flex items-center gap-2 text-warn-500">
              <TrendingDown className="size-3.5" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
                Where the room is
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {genome.growth.map((id) => (
                <li key={id} className="text-[14.5px] text-hi">
                  {nameOf(id)}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* ── Ten readings ────────────────────────────────────────────────── */}
      <Reveal className="mt-12">
        <h3 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
          The ten readings
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mid">
          Each one is drawn from what you actually did — the option you chose, how
          long you took, and what else was waiting. Open any of them for the
          evidence.
        </p>
      </Reveal>
      <div className="mt-6">
        <CapabilityPanel readings={genome.capabilities} />
      </div>

      {/* ── Achievements ────────────────────────────────────────────────── */}
      <Reveal className="mt-6">
        <AchievementStrip />
      </Reveal>

      {/* ── Reflection ──────────────────────────────────────────────────── */}
      <div className="mt-14">
        <Reflection story={genome.story} />
      </div>

      {/* ── Replay ──────────────────────────────────────────────────────── */}
      <Reveal className="mt-14">
        <h3 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
          Watch it back
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mid">
          Scrub the shift. The rating and the queue move together, and the record
          shows what was happening at that minute.
        </p>
      </Reveal>
      <div className="mt-6">
        <Replay />
      </div>

      {/* ── Raw numbers ─────────────────────────────────────────────────── */}
      <Reveal className="mt-14">
        <h3 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
          The raw record
        </h3>
      </Reveal>
      <div
        className={cn(
          "mt-6 grid gap-px overflow-hidden rounded-panel border border-line bg-line",
          "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface px-5 py-4">
            <p className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
              {stat.label}
            </p>
            <p
              data-readout
              className="mt-2 text-[22px] leading-none font-semibold tracking-[-0.03em] text-hi tabular-nums"
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-[12.5px] leading-relaxed text-faint">
        Everything above is derived from your own run — every decision, its
        timing, the queue depth behind it, and every message you sent. None of it
        was visible to you during the shift.
      </p>
    </PageShell>
  );
}
