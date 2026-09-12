"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Boxes, Camera, Snowflake } from "lucide-react";

import {
  CaseHeading,
  CustomerCard,
  InspectButton,
  OutcomeChip,
  SystemChip,
  Voice,
} from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { batchOutcome } from "@/lib/challenge/day-five/outcome";
import { BATCH } from "@/lib/challenge/day-five/scenario";
import type { BatchAction, Day5State } from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Containment first, disposition second — but the list never says so. */
const ACTIONS: BatchAction[] = ["freeze", "pausePicks", "inspect", "escalate", "removeOne", "continue", "wait"];

/**
 * The batch bin, and the three pick waves still drawing from it.
 *
 * One customer reported one jar. The store's own inventory knows there are 24
 * more and that three live orders are holding them right now — but only if
 * somebody looks.
 */
export function BatchCase({
  state,
  time,
  onInspectPanel,
  onAction,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onInspectPanel: (id: "evidence" | "inventory") => void;
  onAction: (action: BatchAction) => void;
  onConfirm: () => void;
}) {
  const batch = state.batch;
  const reduced = useReducedMotion();
  const outcome = batchOutcome(batch);
  const frozen = batch.actions.includes("freeze");
  const paused = batch.actions.includes("pausePicks");
  const exposed = paused ? 0 : BATCH.ordersAffected;

  return (
    <section aria-label="The batch bin" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow="Case 4 · Support escalation"
        title="One defect. 24 more units."
        sub="A customer reported a jar from this batch eleven minutes ago."
        tone="alert"
      />

      <Voice
        from="Customer support"
        role="Escalation"
        time={time}
        tone="alert"
        lines={BATCH.report}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <InspectButton
          label="Customer evidence"
          detail="What they sent in"
          open={batch.evidenceSeen}
          onOpen={() => onInspectPanel("evidence")}
        />
        <InspectButton
          label="Store inventory"
          detail="Same batch code"
          open={batch.inventorySeen}
          onOpen={() => onInspectPanel("inventory")}
        />
      </div>

      {batch.evidenceSeen ? (
        <CustomerCard eyebrow="Submitted photo" tone="warm">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-hi">
            <Camera className="mt-0.5 size-3.5 shrink-0 text-[#e8ddc9]/70" aria-hidden />
            {BATCH.evidence}
          </p>
        </CustomerCard>
      ) : null}

      {/* ── The bin, and what is drawing from it ── */}
      <div className="rounded-card border border-line bg-surface p-3.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
            <Boxes className="size-3" aria-hidden />
            {BATCH.product}
          </p>
          <SystemChip label="Batch" value={BATCH.batchCode} tone={frozen ? "warn" : "neutral"} />
          {frozen ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-info-500/50 bg-info-500/10 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.12em] text-info-500 uppercase">
              <Snowflake className="size-3" aria-hidden />
              Frozen pending inspection
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Units in the bin */}
          <div>
            <p className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Units in bin</p>
            <div className="mt-1.5 flex flex-wrap gap-1" aria-label={`${BATCH.units} units of batch ${BATCH.batchCode}`}>
              {Array.from({ length: BATCH.units }).map((_, index) => (
                <motion.span
                  key={index}
                  initial={false}
                  animate={{ opacity: frozen ? 0.45 : 1 }}
                  transition={{ duration: 0.4, delay: reduced ? 0 : index * 0.012, ease: easing.outExpo }}
                  className={cn(
                    "block size-3 rounded-sm border",
                    frozen ? "border-info-500/60 bg-info-500/20" : "border-warn-500/50 bg-warn-500/15",
                  )}
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px] text-mid">
              {BATCH.units} units · {frozen ? "held" : "available to pick"}
            </p>
          </div>

          {/* Live exposure */}
          <div>
            <p className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Active customer exposure</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <motion.span
                key={exposed}
                initial={reduced ? false : { y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: easing.outExpo }}
                data-readout
                className={cn(
                  "font-mono text-[34px] leading-none font-semibold tabular-nums",
                  exposed === 0 ? "text-ion-400" : "text-alert-500",
                )}
              >
                {exposed}
              </motion.span>
              <span className="text-[12px] text-lo">
                {exposed === 1 ? "live order holding it" : "live orders holding it"}
              </span>
            </p>
            {batch.inventorySeen ? (
              <p className="mt-2 text-[11.5px] leading-relaxed text-mid">
                {BATCH.activeWaves} pick waves are drawing from this bin. {BATCH.ordersAffected} of tonight&rsquo;s orders
                already contain a jar from {BATCH.batchCode}.
              </p>
            ) : (
              <p className="mt-2 text-[11.5px] text-lo">Open the store inventory to see what else holds this batch.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── What you do, in the order you do it ── */}
      <div>
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Available actions</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {ACTIONS.map((action) => {
            const spec = BATCH.actions[action];
            const taken = batch.actions.includes(action);
            const order = batch.actions.indexOf(action) + 1;
            const risky = action === "continue" || action === "wait" || action === "removeOne";
            return (
              <li key={action}>
                <button
                  type="button"
                  aria-pressed={taken}
                  disabled={batch.confirmed}
                  onClick={() => onAction(action)}
                  className={cn(
                    "flex min-h-11 w-full items-start gap-2.5 rounded-card border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none disabled:opacity-60",
                    taken
                      ? "border-ember-500/60 bg-ember-500/[0.08]"
                      : "border-line bg-elevated hover:border-line-bright",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                      taken ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong text-faint",
                    )}
                    aria-hidden
                  >
                    {taken ? order : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-hi">{spec.label}</span>
                    <span className={cn("block text-[10.5px]", risky ? "text-warn-500" : "text-lo")}>{spec.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence initial={false}>
        {frozen && paused ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: easing.outExpo }}
          >
            <CustomerCard eyebrow="Prevented" tone="clear">
              <p className="text-[15px] leading-snug font-semibold text-hi">One customer found it.</p>
              <p className="mt-1 text-[15px] leading-snug text-ion-400">You protected the next {BATCH.units}.</p>
            </CustomerCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {batch.confirmed ? <OutcomeChip state={outcome.use} headline={outcome.headline} detail={outcome.detail} /> : null}

      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        disabled={batch.actions.length === 0}
        onClick={onConfirm}
      >
        Close the escalation
        <ArrowRight />
      </Button>
    </section>
  );
}
