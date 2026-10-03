"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CallOption, IncomingCall } from "@/lib/challenge/calls";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * An incoming call, over everything.
 *
 * Deliberately the only thing on Day 1 that takes the screen. The queue waits
 * its turn and the board can be ignored; a ringing phone cannot, and the
 * twenty seconds it rings are twenty seconds the floor keeps moving without
 * you. Declining is a real option with a real cost, which is the point —
 * the operator has to decide whether this voice is worth the interruption
 * before they know what it wants.
 *
 * Once answered it becomes one question at a time. A list of three questions
 * is a form; one question with the caller waiting is a conversation, and the
 * difference is most of the pressure.
 */
export function CallOverlay({
  call,
  ringFrom,
  elapsed,
  answered,
  onAnswer,
  onDecline,
  onFinish,
}: {
  call: IncomingCall;
  /** Shift second the phone started ringing, for the countdown. */
  ringFrom: number;
  elapsed: number;
  /** Held by the shift, because the shift is what times out an unanswered call. */
  answered: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  /** Every answer given, in order, once the last question is done. */
  onFinish: (answers: CallOption[]) => void;
}) {
  const reduced = useReducedMotion();
  const [at, setAt] = React.useState(0);
  const [given, setGiven] = React.useState<CallOption[]>([]);
  const [reply, setReply] = React.useState<string | null>(null);

  const ringLeft = Math.max(0, call.ringFor - (elapsed - ringFrom));
  const question = call.questions[at];

  function choose(option: CallOption) {
    const next = [...given, option];
    setGiven(next);
    setReply(option.reply);

    // The caller answers back before the next question, so the exchange has a
    // rhythm rather than being three dropdowns in a trench coat.
    window.setTimeout(
      () => {
        setReply(null);
        if (at + 1 >= call.questions.length) onFinish(next);
        else setAt(at + 1);
      },
      reduced ? 350 : 1400,
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-caller"
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
              <span className="absolute inset-0 animate-ping rounded-full border border-ember-500/40" aria-hidden />
            ) : null}
          </span>

          <div className="min-w-0 flex-1">
            <p id="call-caller" className="text-[15px] leading-tight font-semibold text-hi">
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
              data-readout
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
                <Button variant="primary" size="md" onClick={onAnswer} className="flex-1">
                  <Phone />
                  Answer
                </Button>
                <Button variant="secondary" size="md" onClick={onDecline} className="flex-1">
                  <PhoneOff />
                  Ignore
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12.5px] leading-relaxed text-lo italic">
                &ldquo;{call.opening}&rdquo;
              </p>

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
                    &ldquo;{reply}&rdquo;
                  </motion.p>
                ) : question ? (
                  <motion.div
                    key={question.id}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: easing.outExpo }}
                  >
                    <p className="mt-4 text-[15px] leading-snug font-semibold text-hi">
                      &ldquo;{question.text}&rdquo;
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                      Question {at + 1} of {call.questions.length}
                    </p>

                    <div className="mt-3.5 space-y-2">
                      {question.options.map((option) => (
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
