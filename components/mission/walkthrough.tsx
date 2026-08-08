"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsShiftLive } from "@/hooks/use-mission";
import { easing } from "@/lib/motion";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";

/**
 * A one-time orientation, run the moment the shift opens.
 *
 * Deliberately short and skippable: the clock is already running, so every
 * second spent here is a second the operator is not on the floor. Five steps,
 * anchored to real elements rather than a slideshow of screenshots.
 */
interface Step {
  /** Matches a `data-tour` attribute in the control room. */
  target: string;
  title: string;
  body: string;
  /** Where the card sits relative to the target. */
  place: "right" | "left" | "below";
  /** Below `xl` the columns are lanes; open this one before measuring. */
  lane?: "comms" | "floor" | "queue";
}

const STEPS: Step[] = [
  {
    target: "clock",
    title: "Your clock is running",
    body: "Thirty minutes, counting down, and it does not stop. A refresh will not save you and neither will a background tab.",
    place: "below",
  },
  {
    target: "queue",
    title: "This is the work",
    body: "New tasks land every twenty to forty seconds and every one expires. Pick an option to resolve it. You will not clear them all — deciding what to drop is the job.",
    place: "left",
    lane: "queue",
  },
  {
    target: "floor",
    title: "This is the store",
    body: "Orders, riders, staff, stock and the rating you inherited. It all moves on its own, whether or not you are looking.",
    place: "right",
    lane: "floor",
  },
  {
    target: "comms",
    title: "Three people who answer",
    body: "Your store manager, the inventory lead, and a customer who is waiting. Ask them things — how you ask is part of your record.",
    place: "right",
    lane: "comms",
  },
  {
    target: "intake",
    title: "The one big lever",
    body: "Throttling intake protects the promises you have already made and costs you revenue. Most operators reach for it too late.",
    place: "below",
    lane: "floor",
  },
];

const CARD_WIDTH = 320;
const GAP = 14;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectOf(target: string): Rect | null {
  const node = document.querySelector(`[data-tour="${target}"]`);
  if (!node) return null;
  const box = node.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

function cardPosition(rect: Rect, place: Step["place"]) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left =
    place === "right"
      ? rect.left + rect.width + GAP
      : place === "left"
        ? rect.left - CARD_WIDTH - GAP
        : rect.left;

  let top = place === "below" ? rect.top + rect.height + GAP : rect.top;

  // Keep the card on screen whatever the layout is doing.
  left = Math.max(16, Math.min(left, viewportWidth - CARD_WIDTH - 16));
  top = Math.max(16, Math.min(top, viewportHeight - 230));

  return { top, left };
}

export function Walkthrough() {
  const live = useIsShiftLive();
  const seen = useShellStore((state) => state.walkthroughSeen);
  const setSeen = useShellStore((state) => state.setWalkthroughSeen);
  const replay = useShellStore((state) => state.walkthroughReplay);
  const clearReplay = useShellStore((state) => state.setWalkthroughReplay);
  const setLane = useShellStore((state) => state.setMissionLane);

  const active = live && (!seen || replay);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);

  // Re-measure on every step, and whenever the window changes under it.
  React.useEffect(() => {
    if (!active) return;

    const step = STEPS[index];
    if (!step) return;

    // Below `xl` the target may be in a lane that is not on screen.
    if (step.lane) setLane(step.lane);

    const measure = () => setRect(rectOf(step.target));
    // The control room animates in; give it a frame before measuring.
    const raf = requestAnimationFrame(measure);
    const retry = window.setTimeout(measure, 350);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(retry);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, index, setLane]);

  const finish = React.useCallback(() => {
    setSeen(true);
    clearReplay(false);
    setIndex(0);
  }, [setSeen, clearReplay]);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const step = STEPS[index];
  if (!step) return null;

  const isLast = index === STEPS.length - 1;
  const position = rect ? cardPosition(rect, step.place) : null;

  return (
    <AnimatePresence>
      <motion.div
        key="walkthrough"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-110"
      >
        {/*
          Catches a click anywhere off the card so the tour can be dismissed.
          Deliberately transparent while a target is measured: the dimming is
          done entirely by the spotlight's outward shadow below, which stops at
          the ring. A scrim here would sit on top of the very thing the step is
          pointing at. Only when there is nothing to highlight does it dim, so
          the centred card still has something to read against.
        */}
        <div
          className={cn(
            "absolute inset-0",
            !rect && "bg-void/72 backdrop-blur-[1px]",
          )}
          onClick={finish}
        />

        {rect ? (
          <motion.div
            layout
            transition={{ duration: 0.4, ease: easing.outExpo }}
            className="pointer-events-none absolute rounded-xl ring-2 ring-ember-500 ring-offset-4 ring-offset-void/0"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              // The hole. Everything outside the border box is covered; the
              // target itself is left completely untouched.
              boxShadow: "0 0 0 9999px rgba(5,6,9,0.82)",
            }}
          />
        ) : null}

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easing.outExpo }}
          style={
            position
              ? { top: position.top, left: position.left, width: CARD_WIDTH }
              : undefined
          }
          className={cn(
            "overlay-surface absolute rounded-xl p-5",
            !position && "top-1/2 left-1/2 w-80 -translate-x-1/2 -translate-y-1/2",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.16em] text-ember-500 uppercase">
              {index + 1} of {STEPS.length}
            </span>
            <button
              type="button"
              onClick={finish}
              className="ml-auto grid size-6 place-items-center rounded-full text-faint transition-colors hover:bg-white/[0.07] hover:text-hi"
              aria-label="Skip the walkthrough"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <h3 className="mt-2.5 text-[15px] font-medium text-hi">{step.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-mid">{step.body}</p>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => (isLast ? finish() : setIndex((value) => value + 1))}
            >
              {isLast ? "Get to work" : "Next"}
              {isLast ? null : <ArrowRight />}
            </Button>
            {!isLast ? (
              <Button variant="ghost" size="sm" onClick={finish}>
                Skip
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex gap-1">
            {STEPS.map((entry, entryIndex) => (
              <span
                key={entry.target}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors duration-300",
                  entryIndex <= index ? "bg-ember-500" : "bg-white/[0.12]",
                )}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
