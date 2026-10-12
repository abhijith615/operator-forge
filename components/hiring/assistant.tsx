"use client";

import * as React from "react";
import { ArrowUp, HelpCircle } from "lucide-react";

import { answer, openingMessage } from "@/lib/hiring/guide";
import { cn } from "@/lib/utils";
import { useHiringStore } from "@/stores/hiring-store";

import { Sheet } from "./ui";

interface Line {
  id: string;
  from: "assistant" | "you";
  text: string;
  suggestions?: string[];
}

/**
 * Ask what something on the screen means.
 *
 * Lives in the header, next to the timer, so it is in the same place on every
 * screen and never sits on top of the button a decision is made with. It
 * explains; it does not advise. The store's clock does not move while it is
 * open, and the thirty-minute timer does.
 *
 * The conversation is kept for the length of the shift so an answer can be
 * re-read, and only the topic of each question goes into the telemetry.
 */
export function HiringAssistant() {
  const opening = React.useMemo(() => openingMessage(), []);
  const [open, setOpen] = React.useState(false);
  const [asked, setAsked] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { id: "opening", from: "assistant", text: opening.text, suggestions: opening.suggestions },
  ]);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length, open]);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const reply = answer(trimmed);
    setAsked(true);
    useHiringStore.getState().note("assistant", { topic: reply.topic });
    setLines((current) => [
      ...current,
      { id: `you-${current.length}`, from: "you", text: trimmed.slice(0, 240) },
      { id: `assistant-${current.length}`, from: "assistant", text: reply.text, suggestions: reply.suggestions },
    ]);
    setDraft("");
  };

  const suggestions = [...lines].reverse().find((line) => line.from === "assistant")?.suggestions ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-ember-500/45 px-2.5 py-1 text-[13px] font-semibold text-hi transition-colors hover:border-ember-500 hover:bg-ember-500/[0.08]"
      >
        <HelpCircle className="size-3.5 text-ember-500" aria-hidden />
        Ask
        {/* One nudge, until it has been used: somebody who does not know what
            CTD means does not know there is anywhere to ask. */}
        {!asked ? <span aria-hidden className="size-1.5 rounded-full bg-ember-500" /> : null}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Assistant"
        description="Explains what is on the screen. It will not tell you what to decide."
      >
        <div className="space-y-2.5" aria-live="polite">
          {lines.map((line) => (
            <div key={line.id} className={cn("flex", line.from === "you" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
                  line.from === "you" ? "bg-ember-500 text-void" : "border border-line-strong bg-elevated text-hi",
                )}
              >
                {line.text}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Suggestions and the box stay put; the conversation scrolls behind them. */}
        <div className="sticky bottom-0 -mx-1 mt-4 bg-obsidian px-1 pt-3">
        {suggestions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="min-h-[36px] rounded-full border border-line-strong px-3 text-left text-[13px] text-mid transition-colors hover:border-ember-500/50 hover:text-hi"
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
          className="mt-3 flex items-center gap-2"
        >
          <label htmlFor="hiring-ask" className="sr-only">
            Ask what something on the screen means
          </label>
          <input
            id="hiring-ask"
            value={draft}
            maxLength={240}
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What does CTD mean?"
            className="min-h-[46px] flex-1 rounded-full border border-line-strong bg-void px-4 text-[14.5px] text-hi placeholder:text-faint focus:border-ember-500/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ember-500 text-void transition-opacity disabled:opacity-35"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
        </div>
      </Sheet>
    </>
  );
}
