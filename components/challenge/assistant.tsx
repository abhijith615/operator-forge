"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, HelpCircle, X } from "lucide-react";

import { logEvent } from "@/lib/challenge/telemetry";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface CoachLike {
  openingMessage: () => { text: string; suggestions?: string[] };
  answer: (question: string) => { text: string; suggestions?: string[] };
}

interface Line {
  id: string;
  from: "coach" | "you";
  text: string;
  suggestions?: string[];
}

/**
 * Ask about anything on the screen.
 *
 * Day 3 puts PPI, coverage, cross-training, flex budgets and high-value
 * clearance in front of somebody who may never have seen a warehouse, and then
 * asks them to staff an evening with it. Looking a term up should not cost
 * them the shift — and a student who does not know what PPI means does not
 * know to search for it either, which is why the opening offers the questions
 * rather than an empty box.
 *
 * Floating rather than a fourth column: Day 3's three surfaces are already
 * tight at laptop width, and this is consulted occasionally, not watched.
 *
 * Nothing asked here is scored. The questions are logged for telemetry — which
 * terms people actually get stuck on is worth knowing when writing Day 4 —
 * and that log never reaches the scorecard.
 */
export function ChallengeAssistant({
  coach,
  role,
  placeholder,
  day,
}: {
  coach: CoachLike;
  /** Who is on the other end, shown in the header. */
  role: string;
  placeholder: string;
  day: number;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [asked, setAsked] = React.useState(false);
  const opening = React.useMemo(() => coach.openingMessage(), [coach]);
  const [lines, setLines] = React.useState<Line[]>([
    { id: "open", from: "coach", text: opening.text, suggestions: opening.suggestions },
  ]);
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length, open]);

  const ask = React.useCallback((question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const reply = coach.answer(trimmed);
    setAsked(true);
    logEvent("assistant_asked", { question: trimmed, day }, day);
    setLines((prev) => [
      ...prev,
      { id: `you-${prev.length}`, from: "you", text: trimmed },
      { id: `coach-${prev.length}`, from: "coach", text: reply.text, suggestions: reply.suggestions },
    ]);
    setDraft("");
  }, [coach, day]);

  const suggestions =
    [...lines].reverse().find((line) => line.from === "coach")?.suggestions ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-ember-500/50 bg-obsidian/95 px-4 py-2.5 text-[13px] font-medium text-hi shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors",
          "hover:border-ember-500 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
          open && "pointer-events-none opacity-0",
        )}
      >
        <HelpCircle className="size-4 text-ember-500" aria-hidden />
        Ask
        {/* One nudge, until they have used it once. Somebody who does not know
            what PPI is does not know there is anywhere to ask. */}
        {!asked ? (
          <span className="size-1.5 rounded-full bg-ember-500" aria-hidden />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.aside
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: easing.outExpo }}
            aria-label={`Ask the ${role}`}
            className="fixed right-4 bottom-4 z-40 flex max-h-[min(560px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-card border border-line bg-obsidian shadow-[0_40px_90px_-24px_rgba(0,0,0,1)]"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
              <HelpCircle className="size-3.5 text-ember-500" aria-hidden />
              <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
                Ask
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-mid">
                <span className="size-1.5 rounded-full bg-ion-500" aria-hidden />
                {role}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 rounded p-1 text-faint transition-colors hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={cn("flex", line.from === "you" ? "justify-end" : "justify-start")}
                >
                  <p
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                      line.from === "you"
                        ? "bg-ember-500 text-void"
                        : "border border-line-strong bg-elevated text-mid",
                    )}
                  >
                    {line.text}
                  </p>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {suggestions.length > 0 ? (
              <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    className="rounded-full border border-line-strong px-2.5 py-1.5 text-left text-[11.5px] text-mid transition-colors hover:border-ember-500/50 hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(draft);
              }}
              className="flex shrink-0 items-center gap-2 border-t border-line p-2.5"
            >
              <label htmlFor="challenge-ask" className="sr-only">
                Ask about anything on the screen
              </label>
              <input
                id="challenge-ask"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                className="min-h-[40px] flex-1 rounded-full border border-line bg-void px-3.5 text-[12.5px] text-hi placeholder:text-faint focus:border-ember-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ember-500 text-void transition-opacity disabled:opacity-35"
              >
                <ArrowUp className="size-4" />
              </button>
            </form>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
