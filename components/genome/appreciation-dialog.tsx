"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { idleFormState } from "@/lib/auth/form-state";
import { registerInterest } from "@/lib/support/actions";
import { useShellStore } from "@/stores/shell-store";

const SECTORS = [
  "Quick Commerce",
  "Warehouse Operations",
  "Supply Chain",
  "Retail Operations",
  "Logistics",
  "E-commerce",
  "Startup Operations",
] as const;

const QUESTIONS = [
  "What would you have done differently in this mission?",
  "How does this work in a real warehouse?",
  "What skills should I build to get hired?",
  "What does a Hub Supervisor actually do every day?",
  "How can I grow from Operations Executive to Manager?",
] as const;

const WAITLIST = [
  "Advanced Missions",
  "Industry Mentor Calls",
  "Benchmarking Against Top Operators",
] as const;

/**
 * Shown once, after the genome has actually been read.
 *
 * It used to open with a UPI QR code and an ask for money. That arrived in the
 * same breath as someone's first result, which is the worst possible moment to
 * ask a student for ₹100 — and it made a free trial read as a paywall. The ask
 * is gone; what is left is what someone might actually want next.
 *
 * Skipping sits in the same visual weight as everything else, and the dialog
 * scrolls internally — an ask whose decline button is below the fold is a dark
 * pattern by accident.
 */
export function AppreciationDialog() {
  const seen = useShellStore((state) => state.appreciationSeen);
  const setSeen = useShellStore((state) => state.setAppreciationSeen);
  const [open, setOpen] = React.useState(false);

  // Opens when the end of the report scrolls into view — reaching the bottom
  // is the only evidence available that the genome was read rather than
  // landed on.
  const sentinel = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (seen) return;
    const node = sentinel.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOpen(true);
          observer.disconnect();
        }
      },
      // Positive bottom margin, expanding the trigger area downward.
      //
      // This was `-15%`, which shrinks it instead — and since the sentinel is
      // the last element in the document, scrolling to the very end left it
      // resting inside the excluded band with nothing below it to scroll past.
      // It could never intersect, so the dialog never opened for anybody.
      //
      // Expanding is the safe direction: it fires slightly before the absolute
      // end, which still means the closing paragraph is on screen.
      { rootMargin: "0px 0px 80px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);

  /** Closing by any route counts as asked. There is no second time. */
  const dismiss = React.useCallback(() => {
    setOpen(false);
    setSeen(true);
  }, [setSeen]);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span aria-hidden>❤️</span> That Was the Trial Mission
            </DialogTitle>
            <DialogDescription>
              Operator Forge is currently being built independently, mission by
              mission.
            </DialogDescription>
          </DialogHeader>

          <p className="mt-3 text-[13px] leading-relaxed text-mid">
            Your genome is yours to keep. Here is what is coming next, if you
            want to be told when it lands.
          </p>

          <MentorBlock />

          <WaitlistBlock />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] text-lo">
              For more details/queries, contact:{" "}
              {/* Tappable on a phone, which is where most of this will be read. */}
              <a
                href="tel:+918089508891"
                className="font-mono text-ember-400 transition-colors hover:text-ember-200"
              >
                +91-8089508891
              </a>
            </p>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Skip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Coming soon ────────────────────────────────────────────────────────── */

function MentorBlock() {
  return (
    <section className="mt-4 rounded-xl border border-line bg-surface p-5">
      <h3 className="text-[14.5px] font-medium text-hi">
        <span aria-hidden>🚀</span> Coming Soon: Industry Mentor Sessions
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-mid">
        Imagine discussing this exact mission with someone who has actually done
        this job.
      </p>

      <p className="mt-4 text-[12.5px] text-lo">Soon you&rsquo;ll be able to book:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full border border-ember-500/25 bg-ember-500/[0.08] px-2.5 py-1 text-[11.5px] text-ember-400">
          1:1 Operator Sessions
        </span>
        <span className="rounded-full border border-ember-500/25 bg-ember-500/[0.08] px-2.5 py-1 text-[11.5px] text-ember-400">
          30-Minute Live Calls
        </span>
      </div>

      <p className="mt-4 text-[12.5px] text-lo">
        with experienced professionals from:
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
        {SECTORS.map((sector) => (
          <li
            key={sector}
            className="rounded-md border border-line-strong px-2 py-0.5 text-[11.5px] text-mid"
          >
            {sector}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[12.5px] text-lo">Ask anything:</p>
      <ul className="mt-2 space-y-1.5">
        {QUESTIONS.map((question) => (
          <li key={question} className="flex gap-2 text-[12.5px] leading-relaxed text-mid">
            <Check className="mt-0.5 size-3.5 shrink-0 text-ion-400" />
            <span>&ldquo;{question}&rdquo;</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[12.5px] leading-relaxed text-hi">
        No generic career advice.
        <br />
        Real conversations with real operators.
      </p>
    </section>
  );
}

/* ── Early access waitlist ──────────────────────────────────────────────── */

function WaitlistBlock() {
  const [state, action, pending] = useActionState(registerInterest, idleFormState);
  const done = state.status === "success";

  return (
    <section className="mt-4 rounded-xl border border-line bg-surface p-5">
      <h3 className="text-[14.5px] font-medium text-hi">
        <span aria-hidden>🎖️</span> Early Access Waitlist
      </h3>

      <p className="mt-3 text-[12.5px] text-lo">Join the waitlist for:</p>
      <ul className="mt-2 space-y-1.5">
        {WAITLIST.map((item) => (
          <li key={item} className="flex gap-2 text-[12.5px] text-mid">
            <span aria-hidden className="text-ember-500">
              •
            </span>
            {item}
          </li>
        ))}
      </ul>

      {done ? (
        <p className="mt-4 flex items-center gap-2 text-[12.5px] text-ion-400">
          <Check className="size-3.5" />
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-4 flex flex-wrap items-start gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              aria-label="Email for the early access waitlist"
              required
            />
            {state.status === "error" ? (
              <p className="mt-1.5 text-[11.5px] text-alert-500">{state.message}</p>
            ) : null}
          </div>
          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Join Waitlist
          </Button>
        </form>
      )}
    </section>
  );
}
