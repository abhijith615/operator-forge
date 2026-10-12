"use client";

import * as React from "react";
import { Bike, Lock, LockOpen } from "lucide-react";

import { ABSENCE_OPTIONS } from "@/lib/hiring/content";
import { FIXED_ON_FLOOR } from "@/lib/hiring/engine";
import { RIDERS_ROSTERED, STANDBY_RIDERS } from "@/lib/hiring/forms";
import { PEAK_AT, TEMP_AT, clockLabel, flexibleReserve, isLocked, perishablesEta, projectedPeak } from "@/lib/hiring/model";
import { BY_ID, LOCK_LABEL, STATION_LABEL, nameOf } from "@/lib/hiring/roster";
import { STATIONS, type AbsenceChoice, type HiringState, type Station } from "@/lib/hiring/types";
import { skillWord } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";

import { ActionBar, Card, Choice, Eyebrow, Meter, Notice, PrimaryButton, SceneHeading, Sheet } from "../ui";
import type { SceneProps } from "./handover";

const SKILL_TONE: Record<string, string> = {
  Strong: "text-ion-400",
  Trained: "text-hi",
  "Can cover": "text-mid",
  "Not trained": "text-faint",
};

const WORK: Record<Station, string> = {
  picking: "Pick, pack and stage for the rider",
  putaway: "Crates from the dock into bins",
  auditing: "Perishables check, then cycle counts",
};

/**
 * Who does what, and whose device is locked to it.
 *
 * Tap a person, read what they can do, send them somewhere, set their device.
 * The bars are the board's forecast for 06:30 with the floor as it is now —
 * including what the app will do with every unlocked device when the rush
 * comes — and they move as people and locks do. Nothing says whether a floor
 * is good: a store with every device locked shows picking at 74%, one with
 * every device open shows putaway at 53%, and both are simply left that way.
 */
export function FloorBoard({
  state,
  act,
  preview,
}: SceneProps & {
  /** The floor to forecast from, when it is not quite the one in play. */
  preview?: HiringState;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const view = preview ?? state;
  const forecast = projectedPeak(view);
  const reserve = flexibleReserve(view);
  const eta = perishablesEta(view);
  const person = selected ? BY_ID[selected] : null;
  const fixed = selected ? FIXED_ON_FLOOR.has(selected) : false;
  const station = selected ? state.assign[selected] : undefined;
  const locked = selected ? isLocked(state, selected) : false;

  const move = (to: Station) => {
    if (!selected) return;
    act({ t: "assign", emp: selected, to });
    setSelected(null);
  };

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {STATIONS.map((workflow) => {
          const people = Object.keys(state.assign).filter((id) => state.assign[id] === workflow);
          const booked = workflow === "picking" && view.tempArrivesAt !== null && !("temp" in state.assign);
          return (
            <Card key={workflow} className="p-3.5 sm:p-4">
              {workflow === "auditing" ? (
                <div>
                  <p className="text-[14px] font-semibold text-hi">{STATION_LABEL[workflow]}</p>
                  <p className={cn("mt-1 text-[12.5px] leading-snug", eta !== null && eta <= PEAK_AT ? "text-mid" : "text-warn-500")}>
                    {state.audit.doneAt !== null
                      ? `Perishables check finished ${clockLabel(state.audit.doneAt)}.`
                      : eta === null
                        ? "Perishables check: nobody on it."
                        : eta <= PEAK_AT
                          ? `Perishables check done by about ${clockLabel(eta)}.`
                          : "Perishables check will not be done before the rush."}
                  </p>
                </div>
              ) : (
                <Meter label={STATION_LABEL[workflow]} value={forecast[workflow]} hint="of the 06:30 forecast" />
              )}
              <p className="mt-1 text-[11.5px] text-lo">{WORK[workflow]}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {people.map((id) => {
                  const employee = BY_ID[id]!;
                  const word = skillWord(employee.skills[workflow]);
                  const isOpen = workflow !== "picking" && !isLocked(state, id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelected(id)}
                        aria-label={`${employee.name}, ${word}${workflow === "picking" ? "" : isOpen ? ", device unlocked" : ", device locked"}`}
                        className="flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white/[0.035] py-1.5 pr-3 pl-1.5 text-left transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.07]"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-elevated text-[12.5px] font-semibold text-hi">
                          {employee.name.slice(0, 1)}
                        </span>
                        <span className="leading-tight">
                          <span className="block text-[14px] font-semibold text-hi">{employee.name}</span>
                          <span className={cn("block text-[11.5px]", SKILL_TONE[word])}>{word}</span>
                        </span>
                        {workflow === "picking" ? null : isOpen ? (
                          <LockOpen className="size-3.5 shrink-0 text-ion-400" aria-hidden />
                        ) : (
                          <Lock className="size-3.5 shrink-0 text-lo" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
                {booked ? (
                  <li className="flex min-h-[44px] items-center rounded-full border border-dashed border-line-bright px-3.5 text-[12.5px] text-mid">
                    Agency picker · from 06:20
                  </li>
                ) : null}
                {people.length === 0 && !booked ? <li className="py-2 text-[13px] text-lo">Nobody assigned</li> : null}
              </ul>
            </Card>
          );
        })}

        <Card className="p-3.5 sm:p-4">
          <Meter label="Riders" value={forecast.riders} hint="of the 06:30 forecast" />
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-lo">
            <Bike className="size-3.5" aria-hidden />
            {view.riders.on} of {RIDERS_ROSTERED} logged in
            {view.riders.standby ? ` · ${STANDBY_RIDERS} standby called, in by 06:08` : ""}
          </p>
          <button
            type="button"
            onClick={() => act({ t: "standby", on: !state.riders.standby })}
            className="mt-3 min-h-[44px] w-full rounded-[12px] border border-line-strong bg-white/[0.03] px-3 text-[13.5px] font-semibold text-hi transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.08]"
          >
            {state.riders.standby ? "Stand the standby riders down" : `Call the ${STANDBY_RIDERS} standby riders · ₹300`}
          </button>
        </Card>
      </div>

      <Card className="mt-2.5 flex items-center gap-3 p-3.5">
        <span className="tabular grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-[17px] font-semibold text-hi">
          {reserve.length}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-hi">Flexible reserve</p>
          <p className="text-[12.5px] leading-snug text-lo">
            {reserve.length
              ? `${reserve.map(nameOf).join(", ")}: unlocked, and on work that can spare them if the rush is bigger than forecast.`
              : "No device is open to orders on work that could spare it."}
          </p>
        </div>
      </Card>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-lo">
        <span className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden /> Locked to the role
        </span>
        <span className="flex items-center gap-1.5">
          <LockOpen className="size-3.5 text-ion-400" aria-hidden /> Unlocked: the app sends orders in a spike
        </span>
      </p>

      <Sheet
        open={person !== null}
        onOpenChange={() => setSelected(null)}
        title={person?.name ?? ""}
        description={person ? `${person.title} · ${person.tenure}` : undefined}
      >
        {person && selected ? (
          <>
            <p className="text-[14px] leading-snug text-mid">{person.note}</p>
            {person.stats ? (
              <dl className="mt-3 flex gap-5">
                {person.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="font-mono text-[11px] tracking-[0.14em] text-lo uppercase">{stat.label}</dt>
                    <dd className="text-[15px] font-semibold text-hi">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <Eyebrow className="mt-5 mb-2">Trained for</Eyebrow>
            <ul className="grid grid-cols-3 gap-1.5">
              {STATIONS.map((workflow) => {
                const word = skillWord(person.skills[workflow]);
                return (
                  <li key={workflow} className="rounded-[12px] border border-line bg-white/[0.02] px-3 py-2">
                    <span className="block text-[12.5px] text-lo">{STATION_LABEL[workflow]}</span>
                    <span className={cn("block text-[14px] font-semibold", SKILL_TONE[word])}>{word}</span>
                  </li>
                );
              })}
            </ul>
            {Object.values(person.auth).some(Boolean) ? (
              <p className="mt-3 text-[13px] text-mid">
                Authorised:{" "}
                {[
                  person.auth.highValue && "high-value cage",
                  person.auth.audit && "cycle counts",
                  person.auth.riders && "rider handover",
                  person.auth.inwarding && "inwarding",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}

            {fixed ? (
              <Notice className="mt-5 flex items-center gap-2">
                <Lock className="size-4 shrink-0" aria-hidden />
                New joiner on induction. The Floor Lead wants a word about her; she is not moved from this board.
              </Notice>
            ) : (
              <>
                {station && station !== "picking" ? (
                  <>
                    <Eyebrow className="mt-5 mb-2">Device</Eyebrow>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {([true, false] as const).map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          aria-pressed={locked === value}
                          onClick={() => act({ t: "lock", emp: selected, locked: value })}
                          className={cn(
                            "flex min-h-[50px] items-center gap-2 rounded-[12px] border px-3 text-left text-[13px] font-semibold transition-colors",
                            locked === value
                              ? "border-ember-500/70 bg-ember-500/[0.1] text-hi"
                              : "border-line-strong bg-white/[0.03] text-mid hover:border-ember-500/60",
                          )}
                        >
                          {value ? <Lock className="size-4 shrink-0" aria-hidden /> : <LockOpen className="size-4 shrink-0" aria-hidden />}
                          {value ? `Locked to ${STATION_LABEL[station]}` : LOCK_LABEL.unlocked}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <Eyebrow className="mt-5 mb-2">Move to</Eyebrow>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {STATIONS.filter((workflow) => workflow !== station).map((workflow) => (
                    <button
                      key={workflow}
                      type="button"
                      onClick={() => move(workflow)}
                      className="min-h-[50px] rounded-[12px] border border-line-strong bg-white/[0.03] px-3 text-[13.5px] font-semibold text-hi transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.08]"
                    >
                      {STATION_LABEL[workflow]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] leading-snug text-lo">A device that changes role comes up unlocked.</p>
              </>
            )}
          </>
        ) : null}
      </Sheet>
    </>
  );
}

export function Floor({ state, act }: SceneProps) {
  return (
    <>
      <SceneHeading
        eyebrow="Build the floor"
        title="Who does what this morning?"
        sub="Tap a person to see what they can do, move them, and lock or unlock their device. The bars show 06:30 with the floor as it is now."
      />
      <FloorBoard state={state} act={act} />
      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "lockFloor" })}>Set the floor</PrimaryButton>
      </ActionBar>
    </>
  );
}

/**
 * 06:00. The two who had not reported are not coming.
 *
 * Four ways to cover it, any of which can be combined except running short.
 * Booking cover costs money and choosing none costs capacity, and the board
 * shows both.
 */
export function Absence({ state, act }: SceneProps) {
  const [chosen, setChosen] = React.useState<AbsenceChoice[]>([]);

  const toggle = (id: AbsenceChoice) => {
    setChosen((current) => {
      if (current.includes(id)) return current.filter((choice) => choice !== id);
      // Running short is the absence of the other three.
      if (id === "short") return ["short"];
      return [...current.filter((choice) => choice !== "short"), id];
    });
  };

  const preview: HiringState = chosen.includes("onDemand") ? { ...state, tempArrivesAt: TEMP_AT } : state;
  const withoutArjun = projectedPeak(preview, chosen.includes("extend"));

  return (
    <>
      <SceneHeading eyebrow="06:00 · Absence" title="Two short for the morning." />
      <div className="grid gap-2 sm:grid-cols-2">
        <Notice tone="caution">
          <span className="font-semibold">Associate 13</span> · Leave confirmed.
        </Notice>
        <Notice tone="caution">
          <span className="font-semibold">Associate 14</span> · Agency says not coming.
        </Notice>
      </div>

      <Eyebrow className="mt-5 mb-2">What do you do?</Eyebrow>
      <div className="grid gap-2">
        {ABSENCE_OPTIONS.map((option) => (
          <Choice key={option.id} selected={chosen.includes(option.id)} onClick={() => toggle(option.id)} detail={option.detail}>
            {option.label}
          </Choice>
        ))}
      </div>

      <Card className="mt-3">
        <Eyebrow className="mb-3">06:30 with this decision</Eyebrow>
        <div className="grid gap-3.5 sm:grid-cols-3">
          {(["picking", "putaway", "riders"] as const).map((stage) => (
            <Meter key={stage} label={STATION_LABEL[stage]} value={withoutArjun[stage]} />
          ))}
        </div>
        {!chosen.includes("extend") ? (
          <p className="mt-3 text-[12.5px] leading-snug text-lo">Arjun’s overnight shift ends at 06:30. This forecast is without him.</p>
        ) : null}
      </Card>

      {chosen.includes("reallocate") ? (
        <div className="mt-5">
          <Eyebrow className="mb-2">Reallocate</Eyebrow>
          <FloorBoard state={state} act={act} preview={preview} />
        </div>
      ) : null}

      <ActionBar>
        <PrimaryButton disabled={chosen.length === 0} onClick={() => act({ t: "absence", choices: chosen })}>
          Confirm staffing
        </PrimaryButton>
      </ActionBar>
    </>
  );
}
