"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ACTION_CARDS, ACTION_LIMITS } from "@/lib/challenge/day-two/earbuds";
import { ACTION_LANE_LABEL, type ActionLane } from "@/lib/challenge/day-two/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Stage 9 — the action board.
 *
 * Tap-to-place rather than drag-and-drop. Dragging is the more obvious
 * metaphor and it is worse here: it is fiddly on a phone, invisible to a
 * keyboard, and this is a prioritisation exercise rather than a dexterity one.
 * Tapping a card and then a lane does the same job and works everywhere.
 *
 * The lanes are capped because an uncapped board is not a prioritisation. If
 * you can do everything now, nothing was chosen.
 */
export function ActionBoard({
  actions,
  onPlace,
  onCommit,
}: {
  actions: Record<ActionLane, string[]>;
  onPlace: (cardId: string, lane: ActionLane | null) => void;
  onCommit: () => void;
}) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = React.useState<string | null>(null);

  const placed = new Set([...actions.now, ...actions.delegate, ...actions.followUp]);
  const unplaced = ACTION_CARDS.filter((card) => !placed.has(card.id));
  const lanes: ActionLane[] = ["now", "delegate", "followUp"];
  const laneFull = (lane: ActionLane) => actions[lane].length >= ACTION_LIMITS[lane];
  const anyPlaced = placed.size > 0;

  function place(lane: ActionLane) {
    if (!selected || laneFull(lane)) return;
    onPlace(selected, lane);
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Stage · Judgement
        </p>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-hi sm:text-[26px]">
          What happens next, and who does it.
        </h1>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-mid">
          One unit is still unaccounted for. Choose up to {ACTION_LIMITS.now} to
          do now, {ACTION_LIMITS.delegate} to delegate and {ACTION_LIMITS.followUp}{" "}
          to follow up. Everything you leave off the board is also a decision.
        </p>
      </div>

      {/* ── Lanes ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {lanes.map((lane) => {
          const full = laneFull(lane);
          const receptive = selected !== null && !full;
          return (
            <section
              key={lane}
              className={cn(
                "rounded-card border p-3 transition-colors",
                receptive
                  ? "border-ember-500/50 bg-ember-500/[0.05]"
                  : "border-line bg-surface",
              )}
            >
              <header className="flex items-baseline gap-2 px-1 pb-2.5">
                <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
                  {ACTION_LANE_LABEL[lane]}
                </h2>
                <span
                  data-readout
                  className="ml-auto font-mono text-[11px] text-faint tabular-nums"
                >
                  {actions[lane].length}/{ACTION_LIMITS[lane]}
                </span>
              </header>

              <ul className="space-y-1.5">
                {actions[lane].map((cardId) => {
                  const card = ACTION_CARDS.find((c) => c.id === cardId);
                  if (!card) return null;
                  return (
                    <motion.li
                      key={cardId}
                      layout
                      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.22, ease: easing.outExpo }}
                    >
                      <div className="flex items-start gap-2 rounded-lg border border-line-strong bg-elevated px-3 py-2.5">
                        <span className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium text-hi">
                          {card.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onPlace(cardId, null)}
                          aria-label={`Remove ${card.label}`}
                          className="shrink-0 rounded p-0.5 text-lo transition-colors hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                        >
                          <Undo2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => place(lane)}
                disabled={!receptive}
                className={cn(
                  "mt-1.5 w-full rounded-lg border border-dashed px-3 py-2.5 text-[12px] transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  receptive
                    ? "border-ember-500/50 text-ember-400 hover:bg-ember-500/[0.08]"
                    : "border-line text-faint",
                )}
              >
                {full
                  ? "Lane full"
                  : selected
                    ? `Place here`
                    : `Room for ${ACTION_LIMITS[lane] - actions[lane].length}`}
              </button>
            </section>
          );
        })}
      </div>

      {/* ── Cards ── */}
      <section>
        <h2 className="px-1 pb-2 font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Available actions
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {unplaced.map((card) => {
            const isSelected = selected === card.id;
            return (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => setSelected(isSelected ? null : card.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "w-full rounded-card border px-3.5 py-3 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    isSelected
                      ? "border-ember-500/60 bg-ember-500/[0.09]"
                      : "border-line bg-surface hover:border-ember-500/40 hover:bg-white/[0.03]",
                  )}
                >
                  <span className="block text-[13px] leading-snug font-medium text-hi">
                    {card.label}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-mid">
                    {card.detail}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {unplaced.length === 0 ? (
          <p className="px-1 text-[12px] text-lo">Every card is on the board.</p>
        ) : null}
      </section>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!anyPlaced}
        onClick={onCommit}
      >
        {anyPlaced ? "Commit the plan" : "Place at least one action"}
      </Button>
    </div>
  );
}
