"use client";

import { motion } from "framer-motion";
import { Flag } from "lucide-react";

import { Timeline } from "@/components/mission/timeline";
import { PageShell } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { FIRST_SHIFT } from "@/lib/constants/mission";

/**
 * The close-out. Facts only — what the floor looked like when the clock ran
 * out. The reading of it is the Genome, and that is written in Phase 3.
 */
export function ShiftComplete() {
  const world = useMissionStore((state) => state.world);
  const timeline = useMissionStore((state) => state.timeline);
  if (!world) return null;

  const decisions = timeline.filter((entry) => entry.kind === "action").length;
  const events = timeline.filter((entry) => entry.kind === "event").length;
  const openAtClose = world.orders.filter((order) =>
    ["queued", "picking", "packed", "dispatched"].includes(order.status),
  ).length;

  const facts = [
    { label: "Orders delivered on time", value: String(world.metrics.ordersDelivered) },
    { label: "Orders breached", value: String(world.metrics.ordersBreached) },
    { label: "Orders cancelled", value: String(world.metrics.ordersCancelled) },
    { label: "Still open at handover", value: String(openAtClose) },
    { label: "Rating at close", value: world.rating.toFixed(2) },
    { label: "Complaints resolved", value: `${world.complaints.filter((c) => c.resolution).length} of ${world.complaints.length}` },
    { label: "Decisions you made", value: String(decisions) },
    { label: "Things that happened to you", value: String(events) },
  ];

  return (
    <PageShell className="max-w-none xl:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing.outExpo }}
      >
        <div className="flex items-center gap-2.5">
          <Flag className="size-3.5 text-ember-500" />
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
            {FIRST_SHIFT.codename} · Shift over
          </span>
        </div>
        <h2 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi sm:text-[32px]">
          10:00. The next supervisor has the floor.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mid">
          This is what the hub looked like when you handed it over. It is not a
          score — it is the raw shape of the morning you ran.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div>
          <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="bg-surface px-5 py-4">
                <p className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
                  {fact.label}
                </p>
                <p
                  data-readout
                  className="mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em] text-hi tabular-nums"
                >
                  {fact.value}
                </p>
              </div>
            ))}
          </div>

          <div className="panel sheen mt-5 p-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="neutral">Next</Badge>
              <span className="text-[13px] text-mid">Operator Genome</span>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-mid">
              The reading of this shift — ten capabilities, a minute-by-minute
              replay, and what to keep doing — is built from the record on the
              right. That is Phase 3, and it is not written yet.
            </p>
          </div>
        </div>

        <Timeline className="h-[34rem] xl:h-auto xl:max-h-[calc(100dvh-14rem)]" />
      </div>
    </PageShell>
  );
}
