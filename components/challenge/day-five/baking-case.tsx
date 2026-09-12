"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Link2 } from "lucide-react";

import {
  CaseHeading,
  CustomerCard,
  InspectButton,
  OutcomeChip,
  SystemChip,
  Voice,
} from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { bakingOutcome } from "@/lib/challenge/day-five/outcome";
import { BAKING } from "@/lib/challenge/day-five/scenario";
import type { BasketItemId, ContactOption, Day5State } from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const OFFERS: { id: ContactOption; label: string; detail: string }[] = [
  { id: "paste", label: "Vanilla bean paste", detail: BAKING.substitutes.paste.detail },
  { id: "essence", label: "Vanilla essence", detail: BAKING.substitutes.essence.detail },
  { id: "continue", label: "Continue without it", detail: "Four items, vanilla refunded" },
  { id: "cancel", label: "Cancel the order", detail: "Full refund, nothing sent" },
];

/**
 * The ingredient tote.
 *
 * Five lines on a picking screen are five lines. Laid out on a preparation
 * surface and tapped, they stop being independent products — and the empty
 * slot stops being a refund line and becomes the reason the other four are
 * useless tonight.
 */
export function BakingCase({
  state,
  time,
  onInspectItem,
  onCheckStock,
  onCheckSubstitutes,
  onHold,
  onToggleOffer,
  onContact,
  onDispatch,
  onCancel,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onInspectItem: (item: BasketItemId) => void;
  onCheckStock: () => void;
  onCheckSubstitutes: () => void;
  onHold: () => void;
  onToggleOffer: (option: ContactOption) => void;
  onContact: () => void;
  onDispatch: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const baking = state.baking;
  const outcome = bakingOutcome(baking);
  const reduced = useReducedMotion();
  const linked = new Set<BasketItemId>();
  for (const id of baking.inspected) {
    const item = BAKING.items.find((entry) => entry.id === id);
    item?.links.forEach((link) => linked.add(link as BasketItemId));
  }

  return (
    <section aria-label="The ingredient tote" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow={`Case 2 · Order ${BAKING.order}`}
        title="Five items. One actual task."
        sub="Picking is four of five. The automated workflow will refund the fifth and send the rest."
      />

      <div className="flex flex-wrap gap-1.5">
        <SystemChip label="Picked" value={`${BAKING.picked} / ${BAKING.total}`} />
        <SystemChip label="Vanilla extract" value="Nil pick" tone="warn" />
        <SystemChip label="Substitutions" value="Allowed" tone="ok" />
      </div>

      {/* ── The preparation surface ── */}
      <div className="rounded-card border border-line bg-surface p-3.5">
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Look at the basket</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {BAKING.items.map((item) => {
            const opened = baking.inspected.includes(item.id);
            const connected = linked.has(item.id) && !opened;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={opened}
                  disabled={baking.confirmed}
                  onClick={() => onInspectItem(item.id)}
                  className={cn(
                    "flex min-h-[84px] w-full flex-col justify-between rounded-card border p-2.5 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none disabled:opacity-70",
                    !item.picked
                      ? "border-dashed border-warn-500/60 bg-warn-500/[0.05]"
                      : opened
                        ? "border-ion-500/50 bg-ion-500/[0.06]"
                        : connected
                          ? "border-ember-500/45 bg-ember-500/[0.05]"
                          : "border-line-strong bg-elevated hover:border-line-bright",
                  )}
                >
                  <span className="text-[12px] font-semibold text-hi">{item.name}</span>
                  <span className="mt-1 block font-mono text-[9.5px] text-faint">{item.detail}</span>
                  <span
                    className={cn(
                      "mt-1.5 block font-mono text-[9px] tracking-[0.1em] uppercase",
                      item.picked ? "text-ion-400" : "text-warn-500",
                    )}
                  >
                    {item.picked ? "In tote" : "Missing"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence>
          {baking.dependencySeen ? (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easing.outExpo }}
              className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[12.5px] text-ember-400"
            >
              <Link2 className="size-3.5 shrink-0" aria-hidden />
              Basket dependency detected — missing one item may make the rest less useful.
            </motion.p>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-[12px] text-lo">
              Tap the items. What is this customer likely trying to complete?
            </p>
          )}
        </AnimatePresence>
      </div>

      {/* ── What the store can do about it ── */}
      <div className="grid gap-2 sm:grid-cols-2">
        <InspectButton
          label="Check other stock"
          detail="Anywhere in the store"
          open={baking.stockChecked}
          onOpen={onCheckStock}
        />
        <InspectButton
          label="Check substitutes"
          detail="Same shelf, same job"
          open={baking.substitutesChecked}
          onOpen={onCheckSubstitutes}
        />
      </div>

      {baking.stockChecked ? (
        <p className="rounded-card border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-mid">
          Vanilla extract 30 ml — <span className="text-warn-500">unavailable store-wide</span>. Nothing in back stock,
          nothing inbound tonight.
        </p>
      ) : null}

      {baking.substitutesChecked ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(["paste", "essence"] as const).map((id) => {
            const sub = BAKING.substitutes[id];
            return (
              <div key={id} className="rounded-card border border-line-strong bg-elevated p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-hi">{sub.name}</span>
                  <span className="font-mono text-[11px] text-mid">{sub.price}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-lo">{sub.detail}</p>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-ion-400 uppercase">{sub.fit}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── The tote's fate ── */}
      {!baking.contacted && !baking.confirmed ? (
        <div className="space-y-2.5 rounded-card border border-line bg-surface p-3.5">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Before it packs</p>
          <div className="flex flex-wrap gap-2">
            <Button variant={baking.held ? "secondary" : "primary"} size="md" onClick={onHold} disabled={baking.held}>
              {baking.held ? "Held before packing" : "Hold before packing"}
            </Button>
            <Button variant="secondary" size="md" onClick={onDispatch}>
              Continue · refund the line
            </Button>
            <Button variant="secondary" size="md" onClick={onCancel}>
              Cancel the order
            </Button>
          </div>

          {/* The in-app contact sheet: the operator chooses what to offer. */}
          <div className="rounded-card border border-line-strong bg-elevated p-3">
            <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
              In-app message · what to offer
            </p>
            <p className="mt-1.5 text-[12px] text-mid">“Vanilla extract is unavailable.”</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {OFFERS.map((offer) => {
                const on = baking.offered.includes(offer.id);
                return (
                  <li key={offer.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggleOffer(offer.id)}
                      className={cn(
                        "min-h-11 w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                        on ? "border-ember-500/70 bg-ember-500/[0.1]" : "border-line bg-surface hover:border-line-bright",
                      )}
                    >
                      <span className="block text-[12px] font-semibold text-hi">{offer.label}</span>
                      <span className="block text-[10.5px] text-lo">{offer.detail}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="primary"
              size="md"
              className="mt-2.5 w-full"
              disabled={baking.offered.length === 0}
              onClick={onContact}
            >
              Send to the customer
            </Button>
          </div>
        </div>
      ) : null}

      {baking.contacted && baking.customerChose ? (
        <Voice
          from="Customer"
          role={`Order ${BAKING.order}`}
          time={time}
          tone="customer"
          lines={[BAKING.reply[baking.customerChose] ?? "Thanks."]}
        />
      ) : null}

      {baking.resolution ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <CustomerCard eyebrow="Before" tone="warm">
              <p className="text-[13px] text-hi">4 fulfilled items</p>
              <p className="mt-1 font-mono text-[12px] text-warn-500">+ ₹{BAKING.refundValue} refund</p>
            </CustomerCard>
            <CustomerCard eyebrow="After" tone={outcome.use === "clear" ? "clear" : "risk"}>
              <p className="text-[13px] text-hi">
                {outcome.use === "clear" ? "5 usable ingredients" : "4 items, task unfinished"}
              </p>
              <p className="mt-1 font-mono text-[12px] text-mid">
                {outcome.use === "clear" ? "Nothing refunded" : `₹${BAKING.refundValue} back, cake not made`}
              </p>
            </CustomerCard>
          </div>
          <OutcomeChip state={outcome.use} headline={outcome.headline} detail={outcome.detail} />
        </>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!baking.resolution}
        onClick={onConfirm}
      >
        Close the order
        <ArrowRight />
      </Button>
    </section>
  );
}
