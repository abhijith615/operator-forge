"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MissionCallOption } from "@/lib/mission/calls";
import { easing } from "@/lib/motion";
import { useMissionStore } from "@/stores/mission-store";
import { cn } from "@/lib/utils";

/**
 * The phone, over everything.
 *
 * Deliberately the only thing in the control room that takes the screen. The
 * queue waits its turn and the floor can be glanced at; a ringing phone cannot
 * be, and the twenty seconds it rings are twenty seconds the floor keeps
 * moving without you. Declining is a real option with a real cost, which is
 * the point — the operator decides whether this voice is worth the
 * interruption before they know what it wants.
 *
 * Once answered it becomes one question at a time. Three questions in a list
 * is a form; one question with someone waiting on the other end is a
 * conversation, and that difference is most of the pressure.
 *
 * An outbound call — chasing an absentee — arrives here already answered, so
 * it opens straight into the first thing the other person says.
 */
export function CallOverlay() {
  const reduced = useReducedMotion();
  const pending = useMissionStore((state) => state.call);
  const elapsed = useMissionStore((state) => state.world?.elapsed ?? 0);
  const answerCall = useMissionStore((state) => state.answerCall);
  const endCall = useMissionStore((state) => state.endCall);

  const [at, setAt] = React.useState(0);
  const [given, setGiven] = React.useState<MissionCallOption[]>([]);
  const [reply, setReply] = React.useState<string | null>(null);

  const callId = pending?.call.id ?? null;
  // A new call is a clean sheet, including one that opens while the previous
  // reply is still on screen.
  React.useEffect(() => {
    setAt(0);
    setGiven([]);
    setReply(null);
  }, [callId]);

  const ringLeft = pending
    ? Math.max(0, pending.call.ringFor - (elapsed - pending.ringFrom))
    : 0;
  const rangOut = Boolean(pending) && !pending?.answered && ringLeft <= 0;

  // The shift is what times out an unanswered call, not a timer in here: the
  // countdown is drawn from mission seconds, so a backgrounded tab cannot
  // quietly hold the line open.
  React.useEffect(() => {
    if (rangOut) endCall(null);
  }, [rangOut, endCall]);

  if (!pending || rangOut) return null;
  const { call, answered } = pending;
  const beat = call.beats[at];

  function choose(option: MissionCallOption) {
    const next = [...given, option];
    setGiven(next);
    setReply(option.reply);

    // They answer back before the next question, so the exchange has a rhythm
    // rather than being three dropdowns in a trench coat.
    window.setTimeout(
      () => {
        setReply(null);
        if (at + 1 >= call.beats.length) endCall(next);
        else setAt(at + 1);
      },
      reduced ? 350 : 1600,
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-call-caller"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.34, ease: easing.outExpo }}
        className="w-full max-w-md overflow-hidden rounded-card border border-ember-500/30 bg-obsidian shadow-[0_50px_110px_-30px_rgba(0,0,0,1)]"
      >
        {/* ── Caller ── */}
        <div className="flex items-center gap-3.5 border-b border-line px-5 py-4">
          <span
            className={cn(
              "relative grid size-11 shrink-0 place-items-center rounded-full bg-ember-500/15 text-ember-500",
              !answered && !reduced && "animate-pulse",
            )}
          >
            <Phone className="size-4.5" aria-hidden />
            {!answered ? (
              <span
                className="absolute inset-0 animate-ping rounded-full border border-ember-500/40"
                aria-hidden
              />
            ) : null}
          </span>

          <div className="min-w-0 flex-1">
            <p
              id="mission-call-caller"
              className="text-[15px] leading-tight font-semibold text-hi"
            >
              {call.caller}
            </p>
            <p className="mt-0.5 text-[12px] text-lo">{call.role}</p>
          </div>

          {answered ? (
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-ion-500 uppercase">
              <span className="size-1.5 rounded-full bg-ion-500" aria-hidden />
              On call
            </span>
          ) : (
            <span
              className={cn(
                "font-mono text-[13px] tabular-nums",
                ringLeft <= 7 ? "text-alert-500" : "text-lo",
              )}
            >
              {ringLeft}s
            </span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5">
          {!answered ? (
            <>
              <p className="text-[13.5px] leading-relaxed text-mid">
                Incoming call. The floor does not stop while it rings.
              </p>
              <div className="mt-5 flex gap-2.5">
                <Button variant="primary" size="md" onClick={answerCall} className="flex-1">
                  <Phone />
                  Answer
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => endCall(null)}
                  className="flex-1"
                >
                  <PhoneOff />
                  Ignore
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12.5px] leading-relaxed text-lo italic">{call.opening}</p>

              <AnimatePresence mode="wait">
                {reply ? (
                  <motion.p
                    key="reply"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: easing.outExpo }}
                    className="mt-4 rounded-card border border-ion-500/30 bg-ion-500/[0.07] px-4 py-3 text-[13.5px] leading-relaxed text-hi"
                  >
                    {reply}
                  </motion.p>
                ) : beat ? (
                  <motion.div
                    key={beat.id}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: easing.outExpo }}
                  >
                    <p className="mt-4 text-[15px] leading-snug font-semibold text-hi">
                      {beat.text}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                      {at + 1} of {call.beats.length}
                    </p>

                    <div className="mt-3.5 space-y-2">
                      {beat.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => choose(option)}
                          className="w-full rounded-card border border-line bg-elevated px-3.5 py-3 text-left text-[13px] leading-snug text-mid transition-colors hover:border-ember-500/50 hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
