"use client";

import * as React from "react";
import { BookOpen, PackageCheck, Search } from "lucide-react";

import { ActionCard, Consequence } from "@/components/challenge/ui";
import { Button } from "@/components/ui/button";
import {
  EMPLOYEES,
  INSPECT_TARGETS,
  NIL_PICK_CHOICES,
  NIL_PICK_SOP,
  PACK_ITEMS,
  RECOVERY_ACTIONS,
  STORE_BENCHMARK,
  countAt,
  type RecoveryAction,
} from "@/lib/challenge/day-one";
import { STATIONS, STATION_LABEL } from "@/lib/challenge/types";
import type { Metrics, SceneChoice, StaffingPlan, Station } from "@/lib/challenge/types";
import { cn } from "@/lib/utils";

/**
 * The interactive body of each task, sized for a panel rather than a page.
 *
 * Content is unchanged from the scene versions — same people, same options,
 * same signals. Only the chrome is different: no page heading, no metrics
 * board, because the store dashboard is its own panel now.
 */

/* ── Floor allocation ─────────────────────────────────────────────────── */

export function FloorBoard({
  plan,
  onChange,
  onConfirm,
}: {
  plan: StaffingPlan;
  onChange: (plan: StaffingPlan) => void;
  onConfirm: () => void;
}) {
  const counts = {
    picking: countAt(plan, "picking"),
    packing: countAt(plan, "packing"),
    dispatch: countAt(plan, "dispatch"),
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-lo">
        Tap a person, then a station. PPI is this store&rsquo;s picking-per-item
        benchmark — {STORE_BENCHMARK.ppiHealthyMin}–{STORE_BENCHMARK.ppiHealthyMax}s
        is healthy here. Fast is not automatically better.
      </p>

      <div
        className="grid grid-cols-3 gap-2"
        role="status"
        aria-label={`Picking ${counts.picking}, packing ${counts.packing}, dispatch ${counts.dispatch}`}
      >
        {STATIONS.map((station) => (
          <div
            key={station}
            className="rounded-card border border-line bg-elevated p-2.5 text-center"
          >
            <p className="text-[9.5px] tracking-[0.08em] text-lo uppercase">
              {STATION_LABEL[station]}
            </p>
            <p
              data-readout
              className="mt-1 text-[18px] leading-none font-semibold text-hi tabular-nums"
            >
              {counts[station]}
            </p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {EMPLOYEES.map((employee) => {
          const at = plan[employee.id] ?? employee.primary;
          const allowed: Station[] = [
            employee.primary,
            ...(employee.secondary ? [employee.secondary] : []),
          ];

          return (
            <li key={employee.id} className="rounded-card border border-line bg-elevated p-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13.5px] font-medium text-hi">{employee.name}</span>
                <span className="font-mono text-[10.5px] text-lo">
                  {employee.ppi ? `PPI ${employee.ppi}s · ` : ""}
                  {employee.accuracy}%
                </span>
              </div>

              <div
                className="mt-2 flex flex-wrap gap-1.5"
                role="group"
                aria-label={`Station for ${employee.name}`}
              >
                {STATIONS.map((station) => {
                  const can = allowed.includes(station);
                  const active = at === station;
                  return (
                    <button
                      key={station}
                      type="button"
                      disabled={!can}
                      aria-pressed={active}
                      onClick={() => onChange({ ...plan, [employee.id]: station })}
                      className={cn(
                        "min-h-[36px] rounded-full border px-3 text-[12px] font-medium transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                        active
                          ? "border-ember-500 bg-ember-500 text-void"
                          : can
                            ? "border-line-strong text-mid hover:border-ember-500/50 hover:text-hi"
                            : "cursor-not-allowed border-line text-faint opacity-50",
                      )}
                    >
                      {STATION_LABEL[station]}
                      {!can ? <span className="sr-only"> — not trained</span> : null}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <Button variant="primary" size="md" className="w-full" onClick={onConfirm}>
        Confirm floor
      </Button>
    </div>
  );
}

/* ── Nil pick ─────────────────────────────────────────────────────────── */

export function NilPickBoard({
  inspected,
  onInspect,
  onChoose,
}: {
  inspected: string[];
  onInspect: (id: string) => void;
  onChoose: (choice: SceneChoice) => void;
}) {
  const [sopOpen, setSopOpen] = React.useState(false);
  const found = inspected.includes("replenishment");

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-hi">What do you want checked?</p>

      <ul className="space-y-2">
        {INSPECT_TARGETS.map((target) => {
          const done = inspected.includes(target.id);
          return (
            <li key={target.id}>
              <button
                type="button"
                onClick={() => onInspect(target.id)}
                disabled={done}
                className={cn(
                  "min-h-[54px] w-full rounded-card border p-3 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  done
                    ? target.units > 0
                      ? "border-ion-500/45 bg-ion-500/[0.07]"
                      : "border-line bg-elevated/60"
                    : "border-line bg-elevated hover:border-ember-500/40",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Search className="size-3.5 shrink-0 text-lo" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-hi">
                      {target.label}
                    </span>
                    <span className="block text-[11.5px] text-lo">{target.detail}</span>
                  </span>
                  {done ? (
                    <span
                      data-readout
                      className={cn(
                        "shrink-0 font-mono text-[12px] font-semibold tabular-nums",
                        target.units > 0 ? "text-ion-400" : "text-faint",
                      )}
                    >
                      {target.units}
                    </span>
                  ) : null}
                </span>
                {done ? (
                  <span className="mt-2 block border-t border-line pt-2 text-[12px] text-mid">
                    {target.reveal}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {found ? (
        <Consequence
          status="healthy"
          headline="Stock found"
          body="16 units are still on the replenishment pallet. System inventory wasn't wrong — the pick face was empty."
        />
      ) : null}

      <p className="pt-1 text-[12px] font-semibold text-hi">Your next move?</p>
      <div className="space-y-2">
        {NIL_PICK_CHOICES.map((choice) => (
          <ActionCard
            key={choice.id}
            label={choice.label}
            detail={choice.detail}
            onSelect={() => onChoose(choice)}
          />
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setSopOpen((open) => !open)}
          aria-expanded={sopOpen}
          className="inline-flex items-center gap-1.5 text-[12px] text-lo transition-colors hover:text-hi"
        >
          <BookOpen className="size-3.5" aria-hidden />
          {sopOpen ? "Hide SOP" : "View SOP"}
        </button>
        {sopOpen ? (
          <p className="mt-2 rounded-card border border-line bg-elevated p-3 text-[12px] leading-relaxed text-mid">
            <span className="font-semibold text-hi">Nil Pick / Item Not Found. </span>
            {NIL_PICK_SOP}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Packing ──────────────────────────────────────────────────────────── */

type Bag = "bag-1" | "bag-2";

export function PackingBoard({
  onSubmit,
}: {
  onSubmit: (bags: Record<string, Bag>, protection: Record<string, string>) => void;
}) {
  const [bags, setBags] = React.useState<Record<string, Bag>>(
    Object.fromEntries(PACK_ITEMS.map((item) => [item.id, "bag-1" as Bag])),
  );
  const [protection, setProtection] = React.useState<Record<string, string>>(
    Object.fromEntries(PACK_ITEMS.map((item) => [item.id, "standard"])),
  );

  const handling: Record<string, { id: string; label: string }[]> = {
    fragile: [
      { id: "standard", label: "Standard" },
      { id: "fragile", label: "Fragile" },
    ],
    chilled: [
      { id: "standard", label: "Standard" },
      { id: "chilled", label: "Chilled" },
    ],
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-lo">
        Two bags available. Assign each item and choose how it travels.
      </p>

      <ul className="space-y-2">
        {PACK_ITEMS.map((item) => {
          const options = handling[item.kind];
          return (
            <li key={item.id} className="rounded-card border border-line bg-elevated p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[13.5px] font-medium text-hi">{item.name}</span>
                <span className="font-mono text-[11.5px] text-lo">{item.qty}</span>
                <span className="ml-auto text-[10.5px] text-faint">{item.hint}</span>
              </div>

              <div
                className="mt-2 flex flex-wrap gap-1.5"
                role="group"
                aria-label={`Bag for ${item.name}`}
              >
                {(["bag-1", "bag-2"] as Bag[]).map((bag) => (
                  <button
                    key={bag}
                    type="button"
                    aria-pressed={bags[item.id] === bag}
                    onClick={() => setBags((prev) => ({ ...prev, [item.id]: bag }))}
                    className={cn(
                      "min-h-[36px] rounded-full border px-3 text-[12px] font-medium transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      bags[item.id] === bag
                        ? "border-ember-500 bg-ember-500 text-void"
                        : "border-line-strong text-mid hover:text-hi",
                    )}
                  >
                    {bag === "bag-1" ? "Bag 1" : "Bag 2"}
                  </button>
                ))}

                {options
                  ? options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={protection[item.id] === option.id}
                        onClick={() =>
                          setProtection((prev) => ({ ...prev, [item.id]: option.id }))
                        }
                        className={cn(
                          "min-h-[36px] rounded-full border px-3 text-[12px] transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                          protection[item.id] === option.id
                            ? "border-flux-500 bg-flux-500/20 text-flux-400"
                            : "border-line-strong text-mid hover:text-hi",
                        )}
                      >
                        {option.label}
                      </button>
                    ))
                  : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={() => onSubmit(bags, protection)}
      >
        <PackageCheck />
        Seal and send
      </Button>
    </div>
  );
}

/* ── Recovery ─────────────────────────────────────────────────────────── */

export function RecoveryBoard({
  metrics,
  onExecute,
}: {
  metrics: Metrics;
  onExecute: (actions: RecoveryAction[]) => void;
}) {
  const [chosen, setChosen] = React.useState<string[]>([]);

  function toggle(id: string) {
    setChosen((prev) =>
      prev.includes(id)
        ? prev.filter((entry) => entry !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id],
    );
  }

  const ready = chosen.length === 3;

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-hi">
        Choose 3 actions. Tap them in the order you would execute them.
      </p>
      <p className="text-[11.5px] text-lo" role="status" aria-live="polite">
        {chosen.length} of 3 selected{chosen.length > 0 ? " — tap again to remove" : ""}
      </p>

      <div className="space-y-2">
        {RECOVERY_ACTIONS.map((action) => {
          const position = chosen.indexOf(action.id);
          return (
            <ActionCard
              key={action.id}
              label={action.label}
              detail={action.detail}
              selected={position >= 0}
              index={position >= 0 ? position + 1 : undefined}
              disabled={position < 0 && chosen.length >= 3}
              onSelect={() => toggle(action.id)}
            />
          );
        })}
      </div>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={!ready}
        onClick={() =>
          onExecute(
            chosen
              .map((id) => RECOVERY_ACTIONS.find((action) => action.id === id))
              .filter((action): action is RecoveryAction => Boolean(action)),
          )
        }
      >
        {ready ? "Execute recovery plan" : `Select ${3 - chosen.length} more`}
      </Button>
      <p className="sr-only">Click to dispatch is {metrics.ctd} seconds.</p>
    </div>
  );
}
