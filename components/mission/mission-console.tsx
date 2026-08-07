"use client";

import { motion } from "framer-motion";

import { AttentionList } from "@/components/mission/attention-list";
import { HubControls } from "@/components/mission/hub-controls";
import { Timeline } from "@/components/mission/timeline";
import { WorldStrip } from "@/components/mission/world-strip";
import { PageShell } from "@/components/shell/page-header";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { FIRST_SHIFT } from "@/lib/constants/mission";

/** The floor, live. Everything else in the shell is a detail view of this. */
export function MissionConsole({ firstName }: { firstName: string }) {
  const world = useMissionStore((state) => state.world);
  if (!world) return null;

  return (
    <PageShell className="max-w-none xl:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing.outExpo }}
        className="max-w-3xl"
      >
        <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
          {FIRST_SHIFT.codename} · Live · {FIRST_SHIFT.location}
        </p>
        <h2 className="mt-2.5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">
          {hubClock(world.elapsed)} — you have the floor, {firstName}.
        </h2>
        {/* Left-aligned on purpose: the top-right corner is the notification lane. */}
        <div className="mt-5">
          <HubControls />
        </div>
      </motion.div>

      <div className="mt-7">
        <WorldStrip />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_23rem]">
        <AttentionList className="min-h-[22rem]" />
        <Timeline className="h-[32rem] xl:h-auto xl:max-h-[calc(100dvh-19rem)]" />
      </div>
    </PageShell>
  );
}
