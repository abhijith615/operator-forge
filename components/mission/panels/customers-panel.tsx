"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, HeartHandshake, IndianRupee } from "lucide-react";

import {
  EmptyRow,
  PanelFrame,
  StatRow,
  StatusPill,
} from "@/components/mission/panels/panel-frame";
import { Term } from "@/components/mission/term";
import { Button } from "@/components/ui/button";
import { useIsShiftLive } from "@/hooks/use-mission";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";
import type { Complaint } from "@/types/world";

const SEVERITY = {
  high: "alert",
  medium: "warn",
  low: "neutral",
} as const;

export function CustomersPanel() {
  const world = useMissionStore((state) => state.world);
  const dispatch = useMissionStore((state) => state.dispatch);
  const live = useIsShiftLive();
  if (!world) return null;

  const open = world.complaints.filter((complaint) => !complaint.resolution);
  const resolved = world.complaints.filter((complaint) => complaint.resolution);

  return (
    <PanelFrame
      eyebrow="The people waiting"
      title="Customers"
      description={
        <>
          Every complaint here is attached to an order that missed its promise.
          An apology costs nothing and works sometimes; a refund works more often
          and costs the hub. Neither undoes the <Term id="breach">breach</Term>.
        </>
      }
    >
      <StatRow
        items={[
          { label: "Rating", value: world.rating.toFixed(2) },
          { label: "Open complaints", value: String(open.length) },
          { label: "Resolved", value: String(resolved.length) },
          { label: "Refunded", value: `₹${world.metrics.refunded}` },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel sheen overflow-hidden">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Open
            </span>
            <span className="font-mono text-[11px] text-faint tabular-nums">
              {open.length}
            </span>
          </header>

          {open.length === 0 ? (
            <EmptyRow>
              Nobody is complaining. That is not the same as nobody being unhappy.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {open.map((complaint) => (
                  <ComplaintRow
                    key={complaint.id}
                    complaint={complaint}
                    live={live}
                    onResolve={(resolution) =>
                      dispatch({
                        type: "resolve-complaint",
                        complaintId: complaint.id,
                        resolution,
                      })
                    }
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className="panel sheen overflow-hidden">
          <header className="border-b border-line px-4 py-3">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Settled
            </span>
          </header>
          {resolved.length === 0 ? (
            <EmptyRow>Nothing settled yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-line">
              {resolved.map((complaint) => (
                <li key={complaint.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-hi">
                      {complaint.customerName}
                    </p>
                    <p className="truncate text-[11.5px] text-lo">
                      {complaint.orderCode} · {hubClock(complaint.raisedAt)}
                    </p>
                  </div>
                  <StatusPill
                    tone={complaint.resolution === "refunded" ? "flux" : "ion"}
                    className="capitalize"
                  >
                    {complaint.resolution}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelFrame>
  );
}

function ComplaintRow({
  complaint,
  live,
  onResolve,
}: {
  complaint: Complaint;
  live: boolean;
  onResolve: (resolution: "apologised" | "refunded" | "escalated") => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: easing.outExpo }}
      className={cn("px-4 py-4", complaint.severity === "high" && "bg-alert-500/[0.03]")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-medium text-hi">{complaint.customerName}</p>
            <span className="font-mono text-[11px] text-faint">{complaint.orderCode}</span>
            <StatusPill tone={SEVERITY[complaint.severity]} className="capitalize">
              {complaint.severity}
            </StatusPill>
            <span
              data-readout
              className="ml-auto font-mono text-[10.5px] text-faint tabular-nums"
            >
              {hubClock(complaint.raisedAt)}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{complaint.reason}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!live}
          onClick={() => onResolve("apologised")}
        >
          <HeartHandshake />
          Apologise
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!live}
          onClick={() => onResolve("refunded")}
        >
          <IndianRupee />
          Refund ₹250
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!live}
          onClick={() => onResolve("escalated")}
        >
          <ArrowUpRight />
          Escalate
        </Button>
      </div>
    </motion.li>
  );
}
