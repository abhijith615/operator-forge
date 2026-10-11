"use client";

import * as React from "react";
import { ClipboardList, Gauge, TrendingUp, Users } from "lucide-react";

import {
  DEMAND_OUTLOOK,
  HANDOVER_LINES,
  HANDOVER_PANELS,
  PENDING_WORK,
} from "@/lib/hiring/content";
import { CTD_TARGET, metricsOf, projectedPeak } from "@/lib/hiring/model";
import { ROSTER, STATION_LABEL } from "@/lib/hiring/roster";
import { STATIONS, type Action, type HiringState } from "@/lib/hiring/types";

import { ActionBar, Card, Eyebrow, Meter, PrimaryButton, Sheet, Speech, Stat, Tile } from "../ui";

export interface SceneProps {
  state: HiringState;
  act: (action: Action) => void;
}

const ICON = { team: <Users />, metrics: <Gauge />, pending: <ClipboardList />, demand: <TrendingUp /> };

/**
 * 17:25. The store as the outgoing shift left it, and four things that can be
 * opened or not. There is no checklist: what a manager looks at before taking
 * a shift is the first thing the shift finds out about them.
 */
export function Handover({ state, act }: SceneProps) {
  const [open, setOpen] = React.useState<string | null>(null);
  const now = metricsOf(state);
  const forecast = projectedPeak(state);

  const show = (id: string) => {
    act({ t: "inspect", item: id });
    setOpen(id);
  };

  return (
    <>
      <header className="mb-4">
        <Eyebrow className="text-ember-500">Store 114 · 17:25</Eyebrow>
        <h1 className="mt-1.5 text-[26px] leading-[1.08] font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">Shift handover</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Orders waiting" value={now.ordersWaiting} />
        <Stat label="CTD" value={now.ctd} unit={`sec · target ${CTD_TARGET}`} />
        <Stat label="Packing queue" value={now.packingQueue} />
        <Stat label="Riders" value={7} />
        <Stat label="Expected demand" value="+38%" unit="at 18:00" tone="caution" />
        <Stat label="Staff present" value="12" unit="of 14 scheduled" tone="caution" />
      </div>

      <Card className="mt-3">
        <Speech who="Deputy Manager" role="outgoing shift" lines={HANDOVER_LINES} />
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

      <Sheet open={open === "team"} onOpenChange={() => setOpen(null)} title="Team" description="Twelve present. Two scheduled associates have not reported.">
        <ul className="divide-y divide-line">
          {ROSTER.map((employee) => (
            <li key={employee.id} className="flex items-baseline gap-3 py-2.5">
              <span className="w-20 shrink-0 text-[14.5px] font-semibold text-hi">{employee.name}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-mid">
                {employee.title} · {employee.tenure}
                <span className="block text-lo">{employee.note}</span>
              </span>
              <span className="shrink-0 text-[12.5px] text-lo">{STATION_LABEL[state.assign[employee.id]!].split(" ")[0]}</span>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={open === "metrics"} onOpenChange={() => setOpen(null)} title="Store metrics" description="Where each station will stand at 18:00 if nobody moves.">
        <div className="space-y-4">
          {STATIONS.map((station) => (
            <Meter key={station} label={STATION_LABEL[station]} value={forecast[station]} />
          ))}
        </div>
        <p className="mt-4 text-[12.5px] leading-snug text-lo">
          100% is exactly enough people for the forecast. Click-to-dispatch target is {CTD_TARGET} seconds.
        </p>
      </Sheet>

      <Sheet open={open === "pending"} onOpenChange={() => setOpen(null)} title="Pending work">
        <ul className="space-y-2">
          {PENDING_WORK.map((item) => (
            <li key={item.title} className="rounded-[14px] border border-line bg-white/[0.02] px-3.5 py-3">
              <p className="text-[14.5px] font-semibold text-hi">{item.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-mid">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={open === "demand"} onOpenChange={() => setOpen(null)} title="Demand outlook" description="Orders against a normal evening. 100 is normal.">
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
        <p className="mt-4 text-[12.5px] leading-snug text-lo">The peak holds from 18:00 for about half an hour, then eases.</p>
      </Sheet>

      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "takeShift" })}>Take the shift</PrimaryButton>
      </ActionBar>
    </>
  );
}
