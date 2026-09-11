"use client";

import * as React from "react";
import { ArrowRight, FileSearch, Scale, ScanLine } from "lucide-react";

import { ExplainerVideo } from "@/components/challenge/explainer-video";
import { MissionBrief, type BriefStep } from "@/components/challenge/mission-brief";
import { Button } from "@/components/ui/button";
import { DAY_TWO_BRIEF, DAY_TWO_TOTAL_VARIANCE, rupees } from "@/lib/challenge/day-two/ledger";
import { DAY_TWO_DIMENSIONS, DAY_TWO_DIMENSION_LABEL } from "@/lib/challenge/day-two/types";
import { CHALLENGE_VIDEOS } from "@/lib/challenge/videos";

const STEPS: BriefStep[] = [
  {
    icon: ScanLine,
    title: "Count what is really there",
    body: "Establish the physical stock yourself. The system's number is a claim until there is a count beside it.",
  },
  {
    icon: FileSearch,
    title: "Follow the trail",
    body: "Movement logs, orders, scans, access records, CCTV and the exception bay. Open what you think matters — the order you choose is part of the assessment.",
  },
  {
    icon: Scale,
    title: "Separate, then decide",
    body: "Some stock leaves legitimately, some is misplaced, some is genuinely gone. Keep those apart, don't conclude ahead of the evidence, and escalate what you can't explain.",
  },
];

/** Day 2's mission statement, shown before anything is on the clock. */
export function DayTwoIntro({ onStart }: { onStart: () => void }) {
  const total = rupees(DAY_TWO_TOTAL_VARIANCE);
  return (
    <MissionBrief
      eyebrow={`7-Day Challenge · Day 2 · ${DAY_TWO_BRIEF.clock} · ${DAY_TWO_BRIEF.store}`}
      eyebrowTone="alert"
      title={`${total} is missing.`}
      subtitle={DAY_TWO_BRIEF.subtitle}
      video={CHALLENGE_VIDEOS.dayTwoIntro}
      mission={{
        lead: `It is ${DAY_TWO_BRIEF.clock} at ${DAY_TWO_BRIEF.store}. Tonight's inventory audit has turned up ${total} of stock that the system says is on the shelves and the store cannot find.`,
        body: "You are the manager on shift. The job is not to make the number go away. It is to find out what actually happened — and to be able to show how you know.",
      }}
      steps={STEPS}
      assessedOn={DAY_TWO_DIMENSIONS.map((dimension) => DAY_TWO_DIMENSION_LABEL[dimension])}
      clockNote="Fifteen minutes, starting when you begin. Nothing is multiple choice, and nothing on screen will tell you which record matters."
      cta="Begin the audit"
      onStart={onStart}
    />
  );
}

/**
 * The step between opening the earbuds case and counting the cage.
 *
 * The clock is already running here, and the operator can move on at any
 * moment — the brief for Day 2 was explicit that nothing should park them
 * waiting on the simulation.
 */
export function InspectionBriefing({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Secure cage · Bay H1 · Before you count
        </p>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[26px]">
          Watch how a high-value count is done.
        </h1>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
          Every unit is handled and scanned; nothing is taken from the shelf
          label. The clock is still running — start counting whenever you are
          ready.
        </p>
      </div>

      {/* Reached by a click, so the browser allows it to start with sound. */}
      <ExplainerVideo video={CHALLENGE_VIDEOS.dayTwoInspection} autoPlay />

      <Button variant="primary" size="lg" className="w-full" onClick={onContinue}>
        Start counting
        <ArrowRight />
      </Button>
    </div>
  );
}
