"use client";

import * as React from "react";
import { LayoutDashboard, ListChecks, MessagesSquare } from "lucide-react";

import { MissionBrief, type BriefStep } from "@/components/challenge/mission-brief";
import { DAY_ONE, EMPLOYEES } from "@/lib/challenge/day-one";
import { DIMENSIONS, DIMENSION_LABEL } from "@/lib/challenge/types";
import { CHALLENGE_VIDEOS } from "@/lib/challenge/videos";

const STEPS: BriefStep[] = [
  {
    icon: LayoutDashboard,
    title: "Read the board",
    body: "The store dashboard moves on its own. Orders waiting, the packing queue, riders and click-to-dispatch all drift between your decisions.",
  },
  {
    icon: ListChecks,
    title: "Work the queue",
    body: "Tasks keep arriving — the floor plan, a bottleneck, an empty shelf, a packing call, a rider at dispatch. You choose what to open first, and that order is part of the assessment.",
  },
  {
    icon: MessagesSquare,
    title: "Ask, then decide",
    body: "The Senior Store Manager is on comms if you want a second opinion. Every decision moves the store's numbers, and the numbers are what you are read on.",
  },
];

/** Day 1's mission statement, shown before anything is on the clock. */
export function DayOneBrief({ onStart }: { onStart: () => void }) {
  return (
    <MissionBrief
      eyebrow={`7-Day Challenge · Day 1 · ${DAY_ONE.openingTime} · Dark Store 114`}
      title={DAY_ONE.title}
      subtitle={DAY_ONE.subtitle}
      video={CHALLENGE_VIDEOS.dayOneIntro}
      mission={{
        lead: `It is ${DAY_ONE.openingTime} at Dark Store 114 and the breakfast peak is building. Rakesh hasn't reported, so you are running the floor one person short with ${EMPLOYEES.length} people.`,
        body: `The store is judged on one number: click-to-dispatch under ${DAY_ONE.targetCtd} seconds, from the moment an order lands to the moment a rider leaves with it. Your job is to keep it there without breaking anything that protects the customer.`,
      }}
      steps={STEPS}
      assessedOn={DIMENSIONS.map((dimension) => DIMENSION_LABEL[dimension])}
      clockNote="Fifteen minutes, starting when you begin. Tasks that nobody gets to expire, and the store absorbs the cost."
      cta="Begin the shift"
      onStart={onStart}
    />
  );
}
