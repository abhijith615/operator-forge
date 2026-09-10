"use client";

import * as React from "react";
import { ArrowUp, MessagesSquare } from "lucide-react";

import { answer, openingMessage } from "@/lib/challenge/coach";
import { logEvent } from "@/lib/challenge/telemetry";
import { cn } from "@/lib/utils";

interface Line {
  id: string;
  from: "manager" | "you";
  text: string;
  suggestions?: string[];
}

/**
 * The comms panel — a Senior Store Manager you can ask things mid-shift.
 *
 * Suggestions are the important part of the design, not a decoration. A
 * student who has never seen a dark store does not know what is askable, and
 * an empty box with a cursor in it gets used by nobody. Every reply offers the
 * next two or three questions worth asking.
 */
export function CommsPanel({ onAsk }: { onAsk?: (question: string) => void }) {
  const opening = React.useMemo(openingMessage, []);
  const [lines, setLines] = React.useState<Line[]>([
    { id: "open", from: "manager", text: opening.text, suggestions: opening.suggestions },
  ]);
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  const ask = React.useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const reply = answer(trimmed);
      logEvent("sop_viewed", { channel: "comms", question: trimmed });
      onAsk?.(trimmed);

      setLines((prev) => [
        ...prev,
        { id: `you-${prev.length}`, from: "you", text: trimmed },
        {
          id: `mgr-${prev.length}`,
          from: "manager",
          text: reply.text,
          suggestions: reply.suggestions,
        },
      ]);
      setDraft("");
    },
    [onAsk],
  );

  const latestSuggestions =
    [...lines].reverse().find((line) => line.from === "manager")?.suggestions ?? [];

  return (
    <section
      // Same translucent surface as the other two control-room panels, and
      // `flex-1` so it fills its column like they do. It sized to its
      // transcript before, which read as a short card on a flat background and
      // reads as a hole in the floor now that there is one behind it.
      className="flex min-h-0 flex-1 flex-col rounded-card border border-line bg-surface/60 backdrop-blur-2xl"
      aria-label="Communications"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <MessagesSquare className="size-3.5 text-ember-500" aria-hidden />
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Comms
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-mid">
          <span className="size-1.5 rounded-full bg-ion-500" aria-hidden />
          Senior Store Manager
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn("flex", line.from === "you" ? "justify-end" : "justify-start")}
          >
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
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

      {latestSuggestions.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
          {latestSuggestions.map((suggestion) => (
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
        <label htmlFor="comms-input" className="sr-only">
          Ask the Senior Store Manager
        </label>
        <input
          id="comms-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about anything on the floor…"
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
    </section>
  );
}
