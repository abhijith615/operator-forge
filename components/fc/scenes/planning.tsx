"use client";

import * as React from "react";
import { AlertTriangle, Boxes, CalendarClock, Snowflake, Truck, Users, Warehouse, Wrench } from "lucide-react";

import { ActionBar, Card, Choice, Eyebrow, Notice, PrimaryButton, SceneHeading, Sheet, Speech, Stat, Tile } from "@/components/hiring/ui";
import {
  BOOKED,
  CREWS_AT_FULL_TEAM,
  FC_SITE,
  HANDOVER_PANELS,
  NIGHT_LEAD,
  NIGHT_LEAD_LINES,
  NOTICE_OPTIONS,
  QUICKBEV_OPTIONS,
  REPLAN_UPDATES,
  TASK_LABEL,
  TASK_NOTE,
  TEAM,
  VEHICLES,
  type TaskId,
} from "@/lib/fc/content";
import { crewsOf, peakOf, trayOf } from "@/lib/fc/engine";
import { cn } from "@/lib/utils";

import { shuffledBy } from "@/components/hiring/shuffle";
import { useFcStore } from "@/stores/fc-store";

import { DockBoard } from "../dock-board";
import { Avatar, Lines, useFcShuffle, type SceneProps } from "../shared";

const PANEL_ICON: Record<string, React.ReactNode> = {
  docks: <Warehouse />,
  trucks: <Truck />,
  team: <Users />,
  backlog: <Boxes />,
};

/* ── 07:00 Handover ───────────────────────────────────────────────────── */

export function Handover({ state, act }: SceneProps) {
  const [open, setOpen] = React.useState<string | null>(null);
  const panel = HANDOVER_PANELS.find((p) => p.id === open);
  return (
    <>
      <header className="mb-4">
        <Eyebrow className="text-ember-500">{FC_SITE} · 07:00 · Morning inbound shift</Eyebrow>
        <h1 className="mt-1.5 text-[26px] leading-[1.08] font-semibold tracking-[-0.03em] text-hi sm:text-[30px]">Shift handover</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-mid">You run inbound today: trucks, docks, receiving and the team. Look at whatever you need, then take the shift.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Trucks booked" value={5} />
        <Stat label="Docks" value={4} unit="1 cold" />
        <Stat label="Team present" value={13} unit="of 14" tone="caution" />
        <Stat label="Putaway waiting" value={30} unit="pallets" tone="caution" />
      </div>

      <Card className="mt-3">
        <Speech who={NIGHT_LEAD.who} role={NIGHT_LEAD.role} lines={NIGHT_LEAD_LINES} />
      </Card>

      <Eyebrow className="mt-5 mb-2">Before you take it</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {HANDOVER_PANELS.map((p) => (
          <Tile
            key={p.id}
            label={p.title}
            detail={p.detail}
            icon={PANEL_ICON[p.id]}
            opened={state.viewed.includes(p.id)}
            onClick={() => {
              act({ t: "view", panel: p.id });
              setOpen(p.id);
            }}
          />
        ))}
      </div>

      <Sheet open={panel !== undefined} onOpenChange={() => setOpen(null)} title={panel?.title ?? ""} description={panel?.detail}>
        {panel ? <Lines lines={panel.rows} /> : null}
      </Sheet>

      <ActionBar>
        <PrimaryButton onClick={() => act({ t: "continue" })}>Take the shift</PrimaryButton>
      </ActionBar>
    </>
  );
}

/* ── 07:10 Dock plan and team ─────────────────────────────────────────── */

export function Plan(props: SceneProps) {
  return props.state.initialPlan === null ? <BoardStep {...props} /> : <TeamStep {...props} />;
}

function BoardStep({ state, act }: SceneProps) {
  const left = trayOf(state).length;
  return (
    <>
      <SceneHeading eyebrow="07:10 · Dock plan" title="Plan the docks" sub="Put each booked truck on a dock and a time. Plan it so trucks don't wait and crews aren't overloaded." />
      <DockBoard state={state} act={act} crews={CREWS_AT_FULL_TEAM} />
      <ActionBar note={left ? `${left} truck${left === 1 ? "" : "s"} not on the board yet` : "Next: your team"}>
        <PrimaryButton onClick={() => act({ t: "lockPlan" })}>Lock the dock plan</PrimaryButton>
      </ActionBar>
    </>
  );
}

const TASK_ORDER: TaskId[] = ["unload", "scan", "qc", "putaway", "grn"];

function TeamStep({ state, act }: SceneProps) {
  const attempt = useFcStore((store) => store.attempt?.id ?? "");
  // Each person's jobs in an order of their own, so the first button is not always their main job.
  const skillOrder = (skills: TaskId[], who: string) => shuffledBy(skills.map((id) => ({ id })), `${attempt}:skills:${who}`).map((item) => item.id);
  const peak = peakOf(state.board);
  const counts = Object.fromEntries(TASK_ORDER.map((t) => [t, Object.values(state.team).filter((x) => x === t).length])) as Record<TaskId, number>;
  const crews = crewsOf(state.team);
  return (
    <>
      <SceneHeading eyebrow="07:15 · Team" title="Put your team to work" sub="Tap a job under a name to move that person. Each person can only do the jobs they are trained for." />

      <Card className="mb-3">
        <p className="text-[14px] leading-snug text-mid">
          Your plan has up to <span className="font-semibold text-hi">{peak} truck{peak === 1 ? "" : "s"}</span> unloading at the same time. Each one needs a crew of 2 loaders and 1 scanner.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {TASK_ORDER.map((t) => (
            <div key={t} className="rounded-[12px] border border-line bg-white/[0.02] px-2 py-2 text-center">
              <p className="truncate text-[11px] font-medium tracking-[0.04em] text-lo uppercase">{TASK_LABEL[t]}</p>
              <p className="tabular mt-0.5 text-[20px] leading-none font-semibold text-hi">{counts[t]}</p>
            </div>
          ))}
          <div className="rounded-[12px] border border-ember-500/30 bg-ember-500/[0.06] px-2 py-2 text-center">
            <p className="truncate text-[11px] font-medium tracking-[0.04em] text-ember-500 uppercase">Crews</p>
            <p className="tabular mt-0.5 text-[20px] leading-none font-semibold text-hi">{crews}</p>
          </div>
        </div>
      </Card>

      <ul className="space-y-1.5">
        {TEAM.map((person) => (
          <li key={person.id} className="rounded-[14px] border border-line bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={person.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-hi">
                  {person.name} <span className="text-[12.5px] font-normal text-lo">· {person.role}</span>
                </p>
                <p className="truncate text-[12px] text-lo">{person.note}</p>
              </div>
            </div>
            <div role="group" aria-label={`${person.name}'s job`} className="mt-2 flex flex-wrap gap-1.5 pl-12">
              {skillOrder(person.skills, person.id).map((task) => {
                const on = state.team[person.id] === task;
                return (
                  <button
                    key={task}
                    type="button"
                    aria-pressed={on}
                    title={TASK_NOTE[task]}
                    onClick={() => act({ t: "assign", p: person.id, task })}
                    className={cn(
                      "min-h-[36px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                      on ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong bg-white/[0.03] text-mid hover:border-line-bright hover:text-hi",
                    )}
                  >
                    {TASK_LABEL[task]}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
        <li className="flex items-center gap-3 rounded-[14px] border border-dashed border-line px-3 py-2.5 opacity-60">
          <Avatar name="Kavitha" />
          <p className="text-[14px] text-mid">
            Kavitha <span className="text-lo">· Receiver · off sick today</span>
          </p>
        </li>
      </ul>

      <ActionBar note="Jobs: Unloading · Scanning · Quality check · Putaway · GRN desk">
        <PrimaryButton onClick={() => act({ t: "lockTeam" })}>Start the shift</PrimaryButton>
      </ActionBar>
    </>
  );
}

/* ── 07:45 Replan ─────────────────────────────────────────────────────── */

const UPDATE_ICON: Record<string, React.ReactNode> = {
  dairy: <Snowflake className="size-4" />,
  quickbev: <Truck className="size-4" />,
  d2: <Wrench className="size-4" />,
};

export function Replan({ state, act }: SceneProps) {
  const order = useFcShuffle("quickbev");
  const noticeOrder = useFcShuffle("notice");
  const crews = crewsOf(state.team);
  const missing = BOOKED.filter((v) => !state.board[v]);
  const qbOpen = state.quickbev === "board" && !state.board.quickbev;
  return (
    <>
      <SceneHeading eyebrow="07:45 · Things change" title="Update the dock plan" sub="Three things have just happened. Fix the plan before the trucks arrive." />

      <div className="space-y-2">
        {REPLAN_UPDATES.map((u) => (
          <div key={u.id} className="flex gap-3 rounded-[14px] border border-warn-500/35 bg-warn-500/[0.06] px-3.5 py-3 animate-in fade-in-0 slide-in-from-bottom-2">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-warn-500/15 text-warn-500">{UPDATE_ICON[u.id]}</span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-hi">{u.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{u.text}</p>
            </div>
          </div>
        ))}
      </div>

      {state.bumped.length ? (
        <Notice tone="caution" className="mt-3">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-500" aria-hidden />
            <span>
              Taken off the board because they can no longer go where they were:{" "}
              <span className="font-semibold">{state.bumped.map((v) => VEHICLES[v].vendor).join(", ")}</span>.
            </span>
          </span>
        </Notice>
      ) : null}

      <Eyebrow className="mt-5 mb-2">QuickBev at the gate</Eyebrow>
      <div className="space-y-1.5">
        {order(QUICKBEV_OPTIONS).map((o) => (
          <Choice key={o.id} selected={state.quickbev === o.id} onClick={() => act({ t: "quickbev", choice: o.id })} detail={o.detail}>
            {o.label}
          </Choice>
        ))}
      </div>
      {qbOpen ? <p className="mt-2 text-[12.5px] text-ember-500">QuickBev is in the trucks list below. Place it on the board.</p> : null}

      <Eyebrow className="mt-5 mb-2 flex items-center gap-2">
        <CalendarClock className="size-3.5" aria-hidden /> Dock board · {crews} crew{crews === 1 ? "" : "s"} from your team
      </Eyebrow>
      <DockBoard state={state} act={act} crews={crews} />

      <Eyebrow className="mt-5 mb-2">Telling the vendors</Eyebrow>
      <div className="space-y-1.5">
        {noticeOrder(NOTICE_OPTIONS).map((o) => (
          <Choice key={o.id} selected={state.notice === o.id} onClick={() => act({ t: "notice", choice: o.id })} detail={o.detail}>
            {o.label}
          </Choice>
        ))}
      </div>

      <ActionBar note={missing.length ? `Not on the board: ${missing.map((v) => VEHICLES[v].vendor).join(", ")}` : undefined}>
        <PrimaryButton onClick={() => act({ t: "lockReplan" })}>Lock the new plan</PrimaryButton>
      </ActionBar>
    </>
  );
}
