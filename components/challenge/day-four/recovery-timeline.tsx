"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { recoveryWarning } from "@/lib/challenge/day-four/engine";
import { RECOVERY_ACTIONS, WINDOWS, WINDOW_ACTIONS } from "@/lib/challenge/day-four/scenario";
import type { Day4State, RecoveryAction } from "@/lib/challenge/day-four/types";
import { cn } from "@/lib/utils";

const WINDOW_LABEL = ["0–4 min", "4–8 min", "8–12 min"];
const WINDOW_CLOCK = ["10:48–10:52", "10:52–10:56", "10:56–11:00"];

const RISKY: RecoveryAction[] = ["continueUnload", "stopInbound", "cartonsToAisle"];

/**
 * The last twelve minutes, planned in three windows.
 *
 * Blocks go into a window — dragged on a desktop, tapped and placed on a
 * phone. Nothing here says which order is right; a block that the floor won't
 * be able to do when its window comes (storing stock that hasn't been scanned,
 * clearing an aisle that is already clear) says so, and that is all.
 */
export function RecoveryTimeline({
  state,
  onAssign,
  onRemove,
  onLock,
}: {
  state: Day4State;
  onAssign: (window: number, action: RecoveryAction) => void;
  onRemove: (window: number, action: RecoveryAction) => void;
  onLock: () => void;
}) {
  const [picked, setPicked] = React.useState<RecoveryAction | null>(null);
  const [over, setOver] = React.useState<number | null>(null);
  const placed = new Set(state.recovery.flat());
  const total = state.recovery.flat().length;

  return (
    <section aria-label="Recovery timeline" className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        {Array.from({ length: WINDOWS }, (_, window) => {
          const actions = state.recovery[window] ?? [];
          const full = actions.length >= WINDOW_ACTIONS;
          return (
            <div
              key={window}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(window);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const action = event.dataTransfer.getData("text/plain") as RecoveryAction;
                if (RECOVERY_ACTIONS.some((candidate) => candidate.id === action)) onAssign(window, action);
              }}
              className={cn(
                "min-h-[128px] rounded-card border p-2.5 transition-colors",
                over === window ? "border-ember-500 bg-ember-500/[0.06]" : "border-line bg-surface",
              )}
            >
              <p className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-semibold text-hi">{WINDOW_LABEL[window]}</span>
                <span className="font-mono text-[10px] text-faint">{WINDOW_CLOCK[window]}</span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {actions.map((action) => {
                  const spec = RECOVERY_ACTIONS.find((candidate) => candidate.id === action)!;
                  const warning = recoveryWarning(state, window, action);
                  return (
                    <li
                      key={action}
                      className={cn(
                        "rounded-md border px-2.5 py-2",
                        RISKY.includes(action) ? "border-warn-500/50 bg-warn-500/[0.06]" : "border-ember-500/40 bg-ember-500/[0.06]",
                      )}
                    >
                      <p className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium text-hi">{spec.label}</span>
                        <button
                          type="button"
                          onClick={() => onRemove(window, action)}
                          aria-label={`Remove ${spec.label}`}
                          className="rounded p-0.5 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </p>
                      {warning ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-warn-500">
                          <AlertTriangle className="size-3" aria-hidden />
                          {warning}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {picked && !full ? (
                <button
                  type="button"
                  onClick={() => {
                    onAssign(window, picked);
                    setPicked(null);
                  }}
                  className="mt-2 w-full rounded-md border border-dashed border-ember-500/70 py-2 text-[12px] font-medium text-ember-400 hover:bg-ember-500/[0.06] focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                >
                  Place here
                </button>
              ) : actions.length === 0 ? (
                <p className="mt-2 text-[11.5px] text-faint">Nothing scheduled — the floor keeps doing what it is doing.</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Action blocks · two per window</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {RECOVERY_ACTIONS.map((action) => {
            const used = placed.has(action.id);
            const active = picked === action.id;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  draggable={!used}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", action.id)}
                  onClick={() => setPicked(active ? null : action.id)}
                  disabled={used}
                  aria-pressed={active}
                  title={action.detail}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-left text-[12px] transition-colors disabled:cursor-default disabled:opacity-35",
                    "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                    active
                      ? "border-ember-500 bg-ember-500/15 text-hi"
                      : RISKY.includes(action.id)
                        ? "border-line-strong bg-elevated text-mid hover:border-warn-500/60"
                        : "border-line-strong bg-elevated text-mid hover:border-ember-500/60",
                    !used && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  {action.label}
                </button>
              </li>
            );
          })}
        </ul>
        {picked ? (
          <p className="mt-2 text-[12px] text-ember-400">
            Now tap “Place here” in a window.
          </p>
        ) : null}
      </div>

      <Button variant="primary" size="lg" className="w-full" onClick={onLock}>
        Execute recovery
        <ArrowRight />
      </Button>
      {total === 0 ? (
        <p className="text-center text-[11.5px] text-faint">With nothing scheduled, the floor runs on exactly as it is.</p>
      ) : null}
    </section>
  );
}
