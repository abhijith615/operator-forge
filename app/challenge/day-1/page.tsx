import type { Metadata } from "next";

import { DayOneSimulation } from "@/components/challenge/simulation";

export const metadata: Metadata = {
  title: "Day 1 · The 180-Second Shift",
  description:
    "Fifteen minutes running a quick-commerce dark store through a breakfast peak.",
};

/** The clock is the store's, not the browser's — nothing here is cached. */
export const dynamic = "force-dynamic";

export default function DayOnePage() {
  return <DayOneSimulation />;
}
