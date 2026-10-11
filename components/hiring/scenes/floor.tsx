"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { ABSENCE_OPTIONS } from "@/lib/hiring/content";
import { FIXED_ON_FLOOR } from "@/lib/hiring/engine";
import { flexibleReserve, projectedPeak } from "@/lib/hiring/model";
import { BY_ID, STATION_LABEL, nameOf } from "@/lib/hiring/roster";
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

/**
 * Who stands where.
 *
 * Tap a person, read what they can do, send them somewhere. The four bars are
 * the board's forecast for 18:00 with the floor as it is now, and they move as
 * people do. Nothing says whether a floor is good — an overloaded picking line
 * shows as 126% and a thin bench as 67%, and both are simply left that way.
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
  const person = selected ? BY_ID[selected] : null;
  const fixed = selected ? FIXED_ON_FLOOR.has(selected) : false;

  const move = (to: Station) => {
    if (!selected) return;
    act({ t: "assign", emp: selected, to });
    setSelected(null);
  };

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {STATIONS.map((station) => {
          const people = Object.keys(state.assign).filter((id) => state.assign[id] === station);
          const booked = station === "picking" && view.tempArrivesAt !== null && !("temp" in state.assign);
          return (
            <Card key={station} className="p-3.5 sm:p-4">
              <Meter label={STATION_LABEL[station]} value={forecast[station]} hint="of the 18:00 forecast" />
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {people.map((id) => {
                  const employee = BY_ID[id]!;
                  const word = skillWord(employee.skills[station]);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelected(id)}
                        className="flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white/[0.035] py-1.5 pr-3.5 pl-1.5 text-left transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.07]"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-elevated text-[12.5px] font-semibold text-hi">
                          {employee.name.slice(0, 1)}
                        </span>
                        <span className="leading-tight">
                          <span className="block text-[14px] font-semibold text-hi">{employee.name}</span>
                          <span className={cn("block text-[11.5px]", SKILL_TONE[word])}>{word}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {booked ? (
                  <li className="flex min-h-[44px] items-center rounded-full border border-dashed border-line-bright px-3.5 text-[12.5px] text-mid">
                    On-demand picker · from 17:50
                  </li>
                ) : null}
                {people.length === 0 && !booked ? <li className="py-2 text-[13px] text-lo">Nobody assigned</li> : null}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="mt-2.5 flex items-center gap-3 p-3.5">
        <span className="tabular grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-[17px] font-semibold text-hi">
          {reserve.length}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-hi">Flexible reserve</p>
          <p className="text-[12.5px] leading-snug text-lo">
            {reserve.length
              ? `${reserve.map(nameOf).join(", ")} could cover a second station without breaking the first.`
              : "Nobody can be released to a second station without leaving their own short."}
          </p>
        </div>
      </Card>

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
            <ul className="grid grid-cols-2 gap-1.5">
              {STATIONS.map((station) => {
                const word = skillWord(person.skills[station]);
                return (
                  <li key={station} className="rounded-[12px] border border-line bg-white/[0.02] px-3 py-2">
                    <span className="block text-[12.5px] text-lo">{STATION_LABEL[station]}</span>
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
                  person.auth.inventoryCount && "inventory counts",
                  person.auth.riders && "rider coordination",
                  person.auth.inwarding && "inwarding",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}

            <Eyebrow className="mt-5 mb-2">Move to</Eyebrow>
            {fixed ? (
              <Notice className="flex items-center gap-2">
                <Lock className="size-4 shrink-0" aria-hidden />
                Induction week: picking only. Her assignment is decided separately.
              </Notice>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {STATIONS.filter((station) => station !== state.assign[selected]).map((station) => (
                  <button
                    key={station}
                    type="button"
                    onClick={() => move(station)}
                    className="min-h-[50px] rounded-[12px] border border-line-strong bg-white/[0.03] px-3 text-[13.5px] font-semibold text-hi transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.08]"
                  >
                    {STATION_LABEL[station]}
                  </button>
                ))}
              </div>
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
        title="Who stands where tonight?"
        sub="Tap a person to see what they can do and move them. The bars show 18:00 with the floor as it is now."
      />
      <FloorBoard state={state} act={act} />
      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "lockFloor" })}>Lock the floor</PrimaryButton>
      </ActionBar>
    </>
  );
}

/**
 * 17:30. The two who had not reported are not coming.
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

  const preview: HiringState = chosen.includes("onDemand") ? { ...state, tempArrivesAt: 1500 } : state;
  const withoutArjun = projectedPeak(preview, chosen.includes("extend"));

  return (
    <>
      <SceneHeading eyebrow="17:30 · Absence" title="Two short for the evening." />
      <div className="grid gap-2 sm:grid-cols-2">
        <Notice tone="caution">
          <span className="font-semibold">Employee 13</span> · Leave confirmed.
        </Notice>
        <Notice tone="caution">
          <span className="font-semibold">Employee 14</span> · ETA unknown.
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
        <Eyebrow className="mb-3">18:00 with this decision</Eyebrow>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {STATIONS.map((station) => (
            <Meter key={station} label={STATION_LABEL[station]} value={withoutArjun[station]} />
          ))}
        </div>
        {!chosen.includes("extend") ? (
          <p className="mt-3 text-[12.5px] leading-snug text-lo">Arjun’s shift ends at 18:00. This forecast is without him.</p>
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
