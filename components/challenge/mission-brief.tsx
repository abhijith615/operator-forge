"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock, type LucideIcon } from "lucide-react";

import { ExplainerVideo } from "@/components/challenge/explainer-video";
import { Button } from "@/components/ui/button";
import type { ExplainerVideoSpec } from "@/lib/challenge/videos";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface BriefStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * The mission statement every challenge day opens with.
 *
 * Shown before anything is on the clock: what the job is, an explainer to
 * watch or skip, what the operator will be doing, and what is being read. It
 * deliberately does not preview the day's answers — working those out is the
 * day. One component so each day's brief stays the same shape and only the
 * content differs.
 */
export function MissionBrief({
  eyebrow,
  eyebrowTone = "ember",
  title,
  subtitle,
  video,
  mission,
  steps,
  assessedOn,
  clockNote,
  cta,
  onStart,
}: {
  eyebrow: string;
  eyebrowTone?: "ember" | "alert";
  title: string;
  subtitle: string;
  video: ExplainerVideoSpec;
  mission: { lead: string; body: string };
  steps: BriefStep[];
  assessedOn: string[];
  clockNote: string;
  cta: string;
  onStart: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-dvh bg-obsidian">
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easing.outExpo }}
          className="space-y-8"
        >
          <header>
            <p
              className={cn(
                "font-mono text-[10px] tracking-[0.2em] uppercase",
                eyebrowTone === "alert" ? "text-alert-500" : "text-ember-500",
              )}
            >
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.03] font-semibold tracking-[-0.045em] text-hi">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-mid">{subtitle}</p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <section aria-label="Explainer video">
              <ExplainerVideo video={video} />
              <p className="mt-2.5 text-[12px] text-faint">
                Watch it or skip it. The clock only starts when you begin.
              </p>
            </section>

            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="font-mono text-[10px] tracking-[0.18em] text-ember-500 uppercase">
                Your mission
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-hi">{mission.lead}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mid">{mission.body}</p>
            </section>
          </div>

          <ol className="grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-card border border-line bg-surface p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-full border border-ember-500/40 font-mono text-[11px] text-ember-400">
                      {index + 1}
                    </span>
                    <Icon className="size-4 text-lo" aria-hidden />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-hi">{step.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">{step.body}</p>
                </li>
              );
            })}
          </ol>

          <section>
            <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
              How you&apos;re assessed
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {assessedOn.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-mid"
                >
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-4 rounded-card border border-line bg-elevated p-5 sm:flex-row sm:items-center">
            <p className="flex flex-1 gap-2.5 text-[13px] leading-relaxed text-mid">
              <Clock className="mt-0.5 size-4 shrink-0 text-ember-500" aria-hidden />
              {clockNote}
            </p>
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onStart}>
              {cta}
              <ArrowRight />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
