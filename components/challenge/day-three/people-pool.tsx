"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Clock, ShieldCheck, X } from "lucide-react";

import { PeoplePulse } from "@/components/challenge/day-three/people";
import { Avatar, SkillLine, SkillStars, STATION_LETTER } from "@/components/challenge/day-three/ui";
import { Button } from "@/components/ui/button";
import { arjunOvertime, isCrossTrained } from "@/lib/challenge/day-three/capacity";
import { clockLabel } from "@/lib/challenge/day-three/forecast";
import { ARJUN, REGULARS } from "@/lib/challenge/day-three/workforce";
import {
  COVER_LABEL,
  type Day3State,
  type Station,
  type Worker,
} from "@/lib/challenge/day-three/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STATIONS: Station[] = ["picking", "packing", "dispatch"];
const SHORT: Record<Station, string> = { picking: "Pick", packing: "Pack", dispatch: "Disp" };

/**
 * The thirteen people on shift.
 *
 * A card shows what a manager glances at — who, how good, where they are now —
 * and assigns in one tap. Everything else is one more tap away in the sheet,
 * so the pool can be scanned rather than read. Cards are draggable onto the
 * board on a desktop; the tap row is the whole interaction on a phone.
 */
export function PeoplePool({
  state,
  editable,
  onAssign,
  onOpen,
  highlight,
}: {
  state: Day3State;
  editable: boolean;
  onAssign: (workerId: string, station: Station | null) => void;
  onOpen: (workerId: string) => void;
  /** Worker ids to draw attention to in the current moment. */
  highlight?: string[];
}) {
  const unassigned = REGULARS.filter((worker) => !state.assignments[worker.id]).length;
  const overtime = arjunOvertime(state);
  const badgeFor = (id: string) => {
    if (id !== ARJUN.id) return null;
    if (overtime === "accepted") return { text: "Overtime agreed · to 10 PM", tone: "ion" as const };
    if (overtime === "declined") return { text: `Leaves ${clockLabel(ARJUN.rotaEnd)}`, tone: "warn" as const };
    return { text: "OT 8–10 PM · unconfirmed", tone: "faint" as const };
  };

  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex items-baseline gap-2 px-3.5 pt-3.5 pb-2">
        <h2 className="text-[14px] font-semibold text-hi">Your team tonight</h2>
        <span className="font-mono text-[10.5px] text-faint tabular-nums">{REGULARS.length} on shift</span>
        {unassigned > 0 ? (
          <span className="ml-auto rounded-full border border-warn-500/40 px-2 py-0.5 font-mono text-[10px] text-warn-500">
            {unassigned} unassigned
          </span>
        ) : null}
      </header>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-3">
        {REGULARS.map((worker) => (
          <li key={worker.id}>
            <EmployeeCard
              worker={worker}
              station={state.assignments[worker.id] ?? null}
              editable={editable}
              highlighted={highlight?.includes(worker.id) ?? false}
              pulse={state.phase === "arjun" && worker.id === ARJUN.id}
              badge={badgeFor(worker.id)}
              faisalNote={worker.id === "faisal" && state.faisal.length > 0 ? state.faisal : null}
              onAssign={(station) => onAssign(worker.id, station)}
              onOpen={() => onOpen(worker.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function headline(worker: Worker): string {
  if (worker.ppi !== null && worker.skills.picking >= 2) return `PPI ${worker.ppi.toFixed(1)}s`;
  return `${worker.accuracy.toFixed(1)}% ${worker.accuracyLabel.split(" ")[0]?.toLowerCase()}`;
}

function availability(worker: Worker): string | null {
  if (worker.start > 0) return `from ${clockLabel(worker.start)}`;
  if (worker.end < 330) return `until ${clockLabel(worker.end)}`;
  return null;
}

export function EmployeeCard({
  worker,
  station,
  editable,
  highlighted,
  pulse = false,
  badge = null,
  faisalNote,
  onAssign,
  onOpen,
}: {
  worker: Worker;
  station: Station | null;
  editable: boolean;
  highlighted: boolean;
  /** Their moment is live right now. */
  pulse?: boolean;
  badge?: { text: string; tone: "ion" | "warn" | "faint" } | null;
  faisalNote: string[] | null;
  onAssign: (station: Station | null) => void;
  onOpen: () => void;
}) {
  const hours = availability(worker);
  return (
    <div
      draggable={editable}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", worker.id)}
      className={cn(
        "rounded-card border bg-elevated p-2.5 transition-colors",
        editable && "cursor-grab active:cursor-grabbing",
        highlighted
          ? "border-ember-500/60 bg-ember-500/[0.06]"
          : station
            ? "border-line"
            : "border-warn-500/35",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2.5 rounded text-left focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
        aria-label={`${worker.name}, ${worker.level}. Open details`}
      >
        <Avatar worker={worker} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[13.5px] leading-tight font-semibold text-hi">{worker.name}</span>
            {worker.highValue ? (
              <ShieldCheck className="size-3.5 text-ion-400" aria-label="Authorised for high-value stock" />
            ) : null}
            {isCrossTrained(worker) ? (
              <ArrowLeftRight className="size-3 text-info-500" aria-label="Cross-trained" />
            ) : null}
            {pulse ? <PeoplePulse /> : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-lo">
            <span>{worker.level}</span>
            <span className="font-mono text-mid tabular-nums">{headline(worker)}</span>
          </span>
        </span>
      </button>

      <div className="mt-2 flex items-center gap-2">
        <SkillLine worker={worker} className="min-w-0 flex-1" />
        {hours ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[9.5px] text-warn-500">
            <Clock className="size-2.5" aria-hidden />
            {hours}
          </span>
        ) : null}
      </div>

      {badge ? (
        <p
          className={cn(
            "mt-1.5 font-mono text-[10px] tracking-[0.08em]",
            badge.tone === "ion" ? "text-ion-400" : badge.tone === "warn" ? "text-warn-500" : "text-faint",
          )}
        >
          {badge.text}
        </p>
      ) : null}

      {faisalNote ? (
        <p className="mt-1.5 text-[10.5px] text-info-500">Intervention: {faisalNote.join(" + ")}</p>
      ) : null}

      <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label={`Assign ${worker.name}`}>
        {STATIONS.map((option) => {
          const active = station === option;
          const untrained = worker.skills[option] === 0;
          return (
            <button
              key={option}
              type="button"
              disabled={!editable}
              aria-pressed={active}
              onClick={() => onAssign(active ? null : option)}
              className={cn(
                "flex h-8 items-center justify-center gap-1 rounded-md border text-[11px] font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-ember-500/70 bg-ember-500/15 text-hi"
                  : "border-line bg-surface text-lo hover:border-line-bright hover:text-mid",
              )}
            >
              <span className="font-mono text-[9.5px] text-faint">{STATION_LETTER[option]}</span>
              {SHORT[option]}
              {untrained ? <span className="size-1 rounded-full bg-warn-500" aria-label="not trained" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── The detail sheet ─────────────────────────────────────────────────── */

export interface SheetAction {
  label: string;
  detail?: string;
  tone?: "primary" | "secondary" | "danger";
  onClick: () => void;
}

/**
 * Progressive reveal: everything the store knows about one person, and what
 * can be done with them right now. A bottom sheet on a phone, a side panel on
 * a desktop — the same component, so the two never disagree.
 */
export function EmployeeSheet({
  worker,
  station,
  actions,
  onClose,
}: {
  worker: Worker | null;
  station: Station | null;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!worker) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [worker, onClose]);

  return (
    <AnimatePresence>
      {worker ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${worker.name} details`}>
          <motion.button
            type="button"
            aria-label="Close"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
          />
          <motion.div
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? undefined : { y: "100%" }}
            transition={{ duration: 0.3, ease: easing.outExpo }}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-panel border-t border-line bg-obsidian p-5 sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:border-t-0 sm:border-l"
          >
            <div className="flex items-start gap-3">
              <Avatar worker={worker} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[18px] leading-tight font-semibold text-hi">{worker.name}</p>
                <p className="mt-0.5 text-[12.5px] text-mid">
                  {worker.level}
                  {worker.tenure ? ` · ${worker.tenure}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10.5px] text-faint">
                  {station ? `Tonight: ${COVER_LABEL[station]}` : "Not assigned"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              {worker.ppi !== null ? (
                <Stat label="PPI" value={`${worker.ppi.toFixed(1)} sec`} hint="Store range 10–15 sec" />
              ) : null}
              <Stat label={worker.accuracyLabel} value={`${worker.accuracy.toFixed(1)}%`} />
              {worker.attendance !== undefined ? (
                <Stat label="Attendance" value={`${worker.attendance}%`} hint="Last 90 days" />
              ) : null}
              <Stat
                label="Tonight"
                value={`${clockLabel(worker.start)}–${clockLabel(worker.end)}`}
              />
            </dl>

            <div className="mt-4 rounded-card border border-line bg-surface p-3">
              <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Skills</p>
              <ul className="mt-2 space-y-1.5">
                {STATIONS.map((option) => (
                  <li key={option} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-mid">{COVER_LABEL[option]}</span>
                    <SkillStars level={worker.skills[option]} />
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-lo">
                <ShieldCheck className={cn("size-3.5", worker.highValue ? "text-ion-400" : "text-faint")} aria-hidden />
                {worker.highValue ? "Authorised for high-value stock" : "Not authorised for high-value stock"}
              </p>
              {worker.note ? <p className="mt-1.5 text-[11.5px] text-warn-500">{worker.note}</p> : null}
            </div>

            {actions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {actions.map((action) => (
                  <div key={action.label}>
                    <Button
                      variant={action.tone === "danger" ? "danger" : action.tone === "primary" ? "primary" : "secondary"}
                      size="md"
                      className="w-full"
                      onClick={() => {
                        action.onClick();
                        onClose();
                      }}
                    >
                      {action.label}
                    </Button>
                    {action.detail ? (
                      <p className="mt-1 text-center text-[11px] text-faint">{action.detail}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2">
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd data-readout className="mt-1 text-[14px] font-semibold text-hi tabular-nums">
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-[10px] text-faint">{hint}</p> : null}
    </div>
  );
}
