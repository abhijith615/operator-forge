"use client";

import * as React from "react";
import { Check, Lightbulb, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * How a record you can open is supposed to look.
 *
 * Day 2's records were styled like inert panel furniture — a thin grey border
 * and a grey icon, indistinguishable from a heading — so a first-timer read
 * "Open a record. Nothing here will tell you which one matters" and then could
 * not tell that the six boxes above it were the records, or that they were
 * buttons at all. The clock ran while they looked for the thing to click.
 *
 * What the colour says and does not say matters. Unopened is ember: these are
 * the things to do, and you have not done this one. Opened is teal with a
 * tick: you have been here. Neither says which record is the one that explains
 * the variance, because that is the entire assessment — the hint under each
 * label is the same neutral description it always was.
 *
 * Nothing here touches the score. Opening a record is not rewarded and
 * re-opening is not punished: `day2Metrics` reports evidence efficiency and,
 * in its own words, it is "reported, never used to reduce the score directly".
 */
export function recordCardClass(active: boolean, opened: boolean): string {
  return cn(
    "flex w-full flex-col items-start gap-1.5 rounded-card border px-3 py-2.5 text-left transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
    active
      ? "border-ember-500 bg-ember-500/[0.12] shadow-[0_0_0_1px_rgba(245,196,0,0.25)]"
      : opened
        ? "border-ion-500/35 bg-ion-500/[0.04] hover:border-ion-500/60"
        : "border-ember-500/35 bg-ember-500/[0.04] hover:border-ember-500/70 hover:bg-ember-500/[0.08]",
  );
}

export function recordIconClass(active: boolean, opened: boolean): string {
  return cn("size-4", active ? "text-ember-400" : opened ? "text-ion-400" : "text-ember-500");
}

/** The small state marker in the corner of a record. */
export function RecordState({ active, opened }: { active: boolean; opened: boolean }) {
  if (active) {
    return (
      <span className="ml-auto font-mono text-[9px] tracking-[0.12em] text-ember-400 uppercase">
        Open
      </span>
    );
  }
  if (opened) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.12em] text-ion-400 uppercase">
        <Check className="size-3" aria-hidden />
        Read
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.12em] text-ember-500/80 uppercase">
      <span className="size-1.5 rounded-full bg-ember-500" aria-hidden />
      New
    </span>
  );
}

/**
 * A one-off note that says what the surface is for.
 *
 * Deliberately not a tutorial and deliberately not directive. It names the
 * mechanic — these are records, you open them, what you keep goes in the tray
 * — and stops. Telling somebody which record explains the variance would be
 * handing them the answer to the only question Day 2 asks.
 *
 * Dismissible, and it never comes back for that surface. Nothing about it is
 * recorded or scored.
 */
export function GuideNote({
  children,
  storageKey,
}: {
  children: React.ReactNode;
  /** Distinguishes one surface's note from another's within a run. */
  storageKey: string;
}) {
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => setOpen(true), [storageKey]);
  if (!open) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-card border border-ember-500/30 bg-ember-500/[0.06] px-3.5 py-2.5">
      <Lightbulb className="mt-px size-3.5 shrink-0 text-ember-500" aria-hidden />
      <p className="flex-1 text-[12.5px] leading-relaxed text-mid">{children}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="-m-1 shrink-0 rounded p-1 text-faint transition-colors hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        aria-label="Dismiss this note"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
