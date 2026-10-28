"use client";

import * as React from "react";
import { Check, UserRound } from "lucide-react";

import { shuffledBy } from "@/components/hiring/shuffle";
import { Eyebrow, Sheet } from "@/components/hiring/ui";
import { JOB_LABEL, OFFERED, PERSON, SUITED, TASK_LABEL, type JobId } from "@/lib/fc/content";
import type { Action, FcState, Owner } from "@/lib/fc/types";
import { cn } from "@/lib/utils";
import { useFcStore } from "@/stores/fc-store";

export interface SceneProps {
  state: FcState;
  act: (action: Action) => boolean;
}

/** A fixed, answer-blind order for a list, per attempt. */
export function useFcShuffle(key: string): <T extends { id: string }>(items: readonly T[]) => T[] {
  const attempt = useFcStore((store) => store.attempt?.id ?? "");
  return React.useCallback(<T extends { id: string }>(items: readonly T[]) => shuffledBy(items, `${attempt}:${key}`), [attempt, key]);
}

/**
 * "Do it myself" or "give it to…". Shows each person's role and what they are
 * trained for, and leaves the choice alone — the order is shuffled per attempt.
 */
export function OwnerPicker({
  open,
  onOpenChange,
  job,
  onPick,
  state,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobId;
  onPick: (owner: Owner) => void;
  state: FcState;
}) {
  const order = useFcShuffle(`owner:${job}`);
  const people = order(OFFERED[job].map((id) => PERSON[id]));
  const pick = (owner: Owner) => {
    onOpenChange(false);
    onPick(owner);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={JOB_LABEL[job]} description="Do it yourself, or give it to someone on the team.">
      <button
        type="button"
        onClick={() => pick("me")}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border border-ember-500/45 bg-ember-500/[0.07] px-3.5 py-3 text-left transition-colors hover:bg-ember-500/[0.12]"
      >
        <UserRound className="size-5 shrink-0 text-ember-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold tracking-[0.06em] text-hi uppercase">Do it myself</span>
          <span className="mt-0.5 block text-[12.5px] text-mid">You are busy with it until it is done.</span>
        </span>
      </button>
      <Eyebrow className="mt-5 mb-2">Give it to</Eyebrow>
      <ul className="space-y-1.5">
        {people.map((person) => {
          const trained = SUITED[job].includes(person.id);
          return (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => pick(person.id)}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-[14px] border border-line-strong bg-white/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-line-bright hover:bg-white/[0.06]"
              >
                <Avatar name={person.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[14.5px] font-semibold text-hi">{person.name}</span>
                    <span className="text-[12.5px] text-lo">{person.role}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-lo">
                    Now on {TASK_LABEL[state.team[person.id]].toLowerCase()} · {person.note}
                  </span>
                </span>
                <span className={cn("shrink-0 text-right text-[12px] font-semibold", trained ? "text-ion-400" : "text-mid")}>
                  {trained ? "Trained for this" : "Not trained for this"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full border border-line-strong bg-elevated text-[13px] font-semibold text-hi", className)}>
      {name.slice(0, 1)}
    </span>
  );
}

/** A step in a row of steps: done, current, or still to come. */
export function Rail({ steps }: { steps: { id: string; label: string; done: boolean; current?: boolean }[] }) {
  return (
    <ol className="flex items-start gap-1" aria-label="Receiving steps">
      {steps.map((step, index) => (
        <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <span className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1 rounded-full", index === 0 ? "bg-transparent" : steps[index - 1]!.done ? "bg-ion-500/70" : "bg-white/10")} />
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors duration-300",
                step.done ? "border-ion-500 bg-ion-500 text-void" : step.current ? "border-ember-500 text-ember-500" : "border-line-strong text-lo",
              )}
            >
              {step.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : index + 1}
            </span>
            <span className={cn("h-0.5 flex-1 rounded-full", index === steps.length - 1 ? "bg-transparent" : step.done ? "bg-ion-500/70" : "bg-white/10")} />
          </span>
          <span className={cn("w-full truncate px-0.5 text-[11px] font-medium sm:text-[12px]", step.done ? "text-mid" : step.current ? "text-ember-500" : "text-faint")}>
            {step.label}
          </span>
          <span className="sr-only">{step.done ? "done" : "not done"}</span>
        </li>
      ))}
    </ol>
  );
}

/** What a sheet of facts says, as short lines. */
export function Lines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {lines.map((line) => (
        <li key={line} className="flex gap-2.5 text-[14.5px] leading-snug text-hi">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-500" />
          {line}
        </li>
      ))}
    </ul>
  );
}
