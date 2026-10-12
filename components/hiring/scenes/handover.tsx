"use client";

import * as React from "react";
import { Bike, ClipboardCheck, Footprints, Milk, TrendingUp, Users } from "lucide-react";

import {
  AUDITS,
  DEMAND_OUTLOOK,
  FLOOR_WALK,
  HANDOVER_LINES,
  HANDOVER_PANELS,
  PERISHABLES,
} from "@/lib/hiring/content";
import { RIDERS_ROSTERED, STANDBY_RIDERS } from "@/lib/hiring/forms";
import { CTD_TARGET, isLocked, metricsOf, projectedPeak } from "@/lib/hiring/model";
import { PPI_TARGET, ROSTER, STATION_LABEL } from "@/lib/hiring/roster";
import type { Action, HiringState } from "@/lib/hiring/types";
import { pct } from "@/lib/hiring/view";

import { ActionBar, Card, Eyebrow, Facts, PrimaryButton, Sheet, Speech, Stat, Tile } from "../ui";

export interface SceneProps {
  state: HiringState;
  act: (action: Action) => void;
}

const ICON = {
  team: <Users />,
  riders: <Bike />,
  floorwalk: <Footprints />,
  perishables: <Milk />,
  audits: <ClipboardCheck />,
  demand: <TrendingUp />,
};

/**
 * 05:55. The store as the night shift left it, and the morning round: riders,
 * the floor, the fresh lines, the counts, the team and their devices. Any of
 * it can be opened or not. There is no checklist: what a manager looks at
 * before taking a shift is the first thing the shift finds out about them.
 */
export function Handover({ state, act }: SceneProps) {
  const [open, setOpen] = React.useState<string | null>(null);
  const now = metricsOf(state);
  const forecast = projectedPeak(state);
  const absent = RIDERS_ROSTERED - state.riders.on;

  const show = (id: string) => {
    act({ t: "inspect", item: id });
    setOpen(id);
  };

  return (
    <>
      <header className="mb-4">
        <Eyebrow className="text-ember-500">Store 114 · 05:55 · Morning shift</Eyebrow>
        <h1 className="mt-1.5 text-[26px] leading-[1.08] font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">Shift handover</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Orders waiting" value={now.ordersWaiting} />
        <Stat label="CTD" value={now.ctd} unit={`sec · target ${CTD_TARGET}`} />
        <Stat label="Pick speed" value={now.ppi.toFixed(1)} unit={`sec an item · target ${PPI_TARGET}`} />
        <Stat label="Riders" value={state.riders.on} unit={`of ${RIDERS_ROSTERED} logged in`} tone={absent ? "caution" : undefined} />
        <Stat label="Expected demand" value="+38%" unit="at 06:30" tone="caution" />
        <Stat label="Staff present" value="12" unit="of 14 rostered" tone="caution" />
      </div>

      <Card className="mt-3">
        <Speech who="Assistant Store Manager" role="night shift" lines={HANDOVER_LINES} />
      </Card>

      <Eyebrow className="mt-5 mb-2">Before you take it</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {HANDOVER_PANELS.map((panel) => (
          <Tile
            key={panel.id}
            label={panel.label}
            icon={ICON[panel.id]}
            opened={state.handover.includes(panel.id)}
            onClick={() => show(panel.id)}
          />
        ))}
      </div>

      <Sheet
        open={open === "team"}
        onOpenChange={() => setOpen(null)}
        title="Team & devices"
        description="Twelve present. Two rostered associates have not reported. Each handheld is either locked to a role, or unlocked."
      >
        <ul className="divide-y divide-line">
          {ROSTER.map((employee) => {
            const station = state.assign[employee.id]!;
            return (
              <li key={employee.id} className="flex items-baseline gap-3 py-2.5">
                <span className="w-20 shrink-0 text-[14.5px] font-semibold text-hi">{employee.name}</span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-mid">
                  {employee.title} · {employee.tenure}
                  <span className="block text-lo">{employee.note}</span>
                </span>
                <span className="shrink-0 text-right text-[12.5px] leading-snug text-lo">
                  {STATION_LABEL[station]}
                  {station !== "picking" ? <span className="block">{isLocked(state, employee.id) ? "Locked" : "Unlocked"}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[12.5px] leading-snug text-lo">
          An unlocked device on putaway or auditing is sent orders by the app when volume spikes. A locked device never is.
        </p>
      </Sheet>

      <Sheet open={open === "riders"} onOpenChange={() => setOpen(null)} title="Rider attendance" description="Who has logged in, and how bags are being given out.">
        <Facts
          rows={[
            { label: "Rostered this morning", value: String(RIDERS_ROSTERED) },
            { label: "Logged in", value: String(state.riders.on) },
            { label: "Not logged in", value: absent ? `${absent} · no message from either` : "None" },
            { label: "Standby with the rider partner", value: `${STANDBY_RIDERS} · on call, ₹150 each` },
            { label: "Allocation", value: "One order to a rider, in the order packed" },
            { label: "Riders against the 06:30 forecast", value: pct(forecast.riders) },
          ]}
        />
        <p className="mt-4 text-[12.5px] leading-snug text-lo">
          100% is exactly enough riders for the forecast. Delivery is promised in about ten minutes: pick and pack, then the ride.
        </p>
      </Sheet>

      <Sheet open={open === "floorwalk"} onOpenChange={() => setOpen(null)} title="Floor walk" description="What the night shift left on the floor.">
        <ul className="space-y-2">
          {FLOOR_WALK.map((item) => (
            <li key={item.title} className="rounded-[14px] border border-line bg-white/[0.02] px-3.5 py-3">
              <p className="text-[14.5px] font-semibold text-hi">{item.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-mid">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={open === "perishables"} onOpenChange={() => setOpen(null)} title="Perishables" description="The fresh lines, as they stand. This morning’s date and quality check has not been done.">
        <ul className="space-y-2">
          {PERISHABLES.map((item) => (
            <li key={item.item} className="rounded-[14px] border border-line bg-white/[0.02] px-3.5 py-3">
              <p className="text-[14.5px] font-semibold text-hi">{item.item}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-mid">{item.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] leading-snug text-lo">The check is done by whoever is on auditing, before anything else they have.</p>
      </Sheet>

      <Sheet open={open === "audits"} onOpenChange={() => setOpen(null)} title="Audits assigned" description="What auditing has to get through today.">
        <ul className="space-y-2">
          {AUDITS.map((item) => (
            <li key={item.title} className="rounded-[14px] border border-line bg-white/[0.02] px-3.5 py-3">
              <p className="text-[14.5px] font-semibold text-hi">{item.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-mid">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={open === "demand"} onOpenChange={() => setOpen(null)} title="Demand outlook" description="Orders against a normal morning. 100 is normal.">
        <ul className="space-y-2">
          {DEMAND_OUTLOOK.map((point) => (
            <li key={point.hour} className="flex items-center gap-3">
              <span className="tabular w-12 shrink-0 font-mono text-[12.5px] text-lo">{point.hour}</span>
              <span className="h-2.5 flex-1 rounded-full bg-white/[0.06]">
                <span
                  className={point.index >= 130 ? "block h-full rounded-full bg-warn-500" : "block h-full rounded-full bg-white/35"}
                  style={{ width: `${(point.index / 140) * 100}%` }}
                />
              </span>
              <span className="tabular w-10 shrink-0 text-right text-[13.5px] font-semibold text-hi">{point.index}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] leading-snug text-lo">The breakfast peak holds from 06:30 for about half an hour, then eases.</p>
      </Sheet>

      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "takeShift" })}>Take the shift</PrimaryButton>
      </ActionBar>
    </>
  );
}
