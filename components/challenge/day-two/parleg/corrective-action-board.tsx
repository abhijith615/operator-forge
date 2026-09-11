"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Undo2 } from "lucide-react";

import { StageHeading } from "@/components/challenge/day-two/parleg/ui";
import { Button } from "@/components/ui/button";
import {
  CORRECTIVE_CARDS,
  LANE_LABEL,
  LANE_LIMIT,
} from "@/lib/challenge/day-two/parleg/content";
import { laneFull, unplacedCards } from "@/lib/challenge/day-two/parleg/engine";
import type { ParleGState, PgLane } from "@/lib/challenge/day-two/parleg/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LANES: PgLane[] = ["fixNow", "preventRepeat", "notNeeded"];

const LANE_NOTE: Record<PgLane, string> = {
  fixNow: "Tonight",
  preventRepeat: "So it cannot rebuild",
  notNeeded: "Deliberately not doing",
};

/**
 * Stage 4 — correct and prevent.
 *
 * Cards are dealt one at a time, which is a different mechanic from Case 01's
 * board on purpose: each card is a decision in isolation, the way a manager
 * actually meets them. Tap a destination, or drag the card into a lane on a
 * desktop. Fix now and prevent repeat are capped at three, so choosing every
 * sensible card is not possible — which is the point.
 */
export function CorrectiveActionBoard({
  state,
  onPlace,
  onCommit,
}: {
  state: ParleGState;
  onPlace: (cardId: string, lane: PgLane | null) => void;
  onCommit: () => void;
}) {
  const reduced = useReducedMotion();
  const deck = unplacedCards(state);
  const [cursor, setCursor] = React.useState(0);
  const current = deck.length > 0 ? deck[cursor % deck.length]! : null;
  const placedCount = CORRECTIVE_CARDS.length - deck.length;

  function send(lane: PgLane) {
    if (!current || laneFull(state, lane)) return;
    onPlace(current.id, lane);
  }

  return (
    <div className="space-y-5">
      <StageHeading
        eyebrow="Stage 4 · Correct & prevent"
        title="Fix tonight. Stop it rebuilding."
        sub={`Up to ${LANE_LIMIT.fixNow} to fix now and ${LANE_LIMIT.preventRepeat} to prevent a repeat. Everything else is not needed.`}
      />

      {current ? (
        <div className="mx-auto max-w-xl rounded-panel border border-line-strong bg-elevated p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase tabular-nums">
            Action {placedCount + 1} of {CORRECTIVE_CARDS.length}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={reduced ? false : { x: 16 }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: -16 }}
              transition={{ duration: 0.2, ease: easing.outExpo }}
              className="mt-2"
            >
              {/* Native drag lives on a plain element: Framer Motion claims
                  the drag props on its own components for its gesture system. */}
              <div
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", current.id)}
                className="cursor-grab rounded-card border border-line bg-surface p-4"
              >
                <p className="text-[15px] leading-snug font-semibold text-hi">{current.label}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{current.detail}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {LANES.map((lane) => {
              const full = laneFull(state, lane);
              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => send(lane)}
                  disabled={full}
                  className={cn(
                    "min-h-[48px] rounded-card border px-2 py-2 text-[12.5px] font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    full
                      ? "border-line text-faint"
                      : lane === "notNeeded"
                        ? "border-line-strong text-mid hover:border-line-bright hover:text-hi"
                        : "border-ember-500/40 text-hi hover:bg-ember-500/[0.08]",
                  )}
                >
                  {LANE_LABEL[lane]}
                  {full ? <span className="block text-[10px] text-faint">Full</span> : null}
                </button>
              );
            })}
          </div>

          {deck.length > 1 ? (
            <button
              type="button"
              onClick={() => setCursor((c) => c + 1)}
              className="mt-2.5 w-full rounded py-1 text-[11.5px] text-lo transition-colors hover:text-mid focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              Decide this one later
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto max-w-xl space-y-3 rounded-panel border border-line-strong bg-elevated p-4 text-center">
          <p className="text-[13px] text-mid">
            All {CORRECTIVE_CARDS.length} actions are on the board.
          </p>
          <Button variant="primary" size="lg" className="w-full" onClick={onCommit}>
            Close the board
            <ArrowRight />
          </Button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {LANES.map((lane) => (
          <Zone key={lane} lane={lane} state={state} onPlace={onPlace} />
        ))}
      </div>
    </div>
  );
}

function Zone({
  lane,
  state,
  onPlace,
}: {
  lane: PgLane;
  state: ParleGState;
  onPlace: (cardId: string, lane: PgLane | null) => void;
}) {
  const ids = state.actions[lane];
  const limit = LANE_LIMIT[lane];
  const [over, setOver] = React.useState(false);

  return (
    <section
      aria-label={LANE_LABEL[lane]}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const id = event.dataTransfer.getData("text/plain");
        if (id) onPlace(id, lane);
      }}
      className={cn(
        "min-h-[120px] rounded-card border p-3 transition-colors",
        over ? "border-ember-500/60 bg-ember-500/[0.05]" : "border-line bg-surface",
      )}
    >
      <header className="flex items-baseline gap-2 pb-2">
        <h2 className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          {LANE_LABEL[lane]}
        </h2>
        <span className="text-[10.5px] text-faint">{LANE_NOTE[lane]}</span>
        <span data-readout className="ml-auto font-mono text-[11px] text-faint tabular-nums">
          {ids.length}
          {limit !== null ? `/${limit}` : ""}
        </span>
      </header>
      <ul className="space-y-1.5">
        {ids.map((id) => {
          const card = CORRECTIVE_CARDS.find((c) => c.id === id);
          if (!card) return null;
          return (
            <li
              key={id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", id)}
              className="flex items-start gap-2 rounded-lg border border-line-strong bg-elevated px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 text-[12px] leading-snug font-medium text-hi">
                {card.label}
              </span>
              <button
                type="button"
                onClick={() => onPlace(id, null)}
                aria-label={`Take back ${card.label}`}
                className="shrink-0 rounded p-0.5 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <Undo2 className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {ids.length === 0 ? <p className="text-[11.5px] text-faint">Nothing here yet.</p> : null}
    </section>
  );
}
