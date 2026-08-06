import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Genome" };

export default function GenomePage() {
  return (
    <LockedPanel
      href="/genome"
      contents={[
        "Ten capabilities on an animated radar — no percentages, no marks",
        "A replay of your shift, minute by minute, with what you did at each turn",
        "Where your judgement held and where it slipped, quoted from the record",
        "What to keep doing, written as advice rather than as a grade",
      ]}
    />
  );
}
