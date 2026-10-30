"use client";

import * as React from "react";
import { ArrowRight, Lock, LockOpen, X } from "lucide-react";

import { BN_PANELS } from "@/lib/hiring/engine";
import { PROCESS_FIX, RIDERS_ROSTERED, STANDBY_RIDERS, floorLeadSays, formFor } from "@/lib/hiring/forms";
import { CTD_TARGET, aisleBlocked, clockLabel, floorHolding, isLocked, metricsOf, ridersOn } from "@/lib/hiring/model";
import { PPI_TARGET, STATION_LABEL, isTemp, nameOf } from "@/lib/hiring/roster";
import {
  STATIONS,
  type HiringState,
  type Intervention,
  type Stage,
  type Station,
  type TriageCall,
  type TriageMode,
} from "@/lib/hiring/types";
import { PERSONAL_COST, moverOptions, ownerOptions, pct } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";

import {
  ActionBar,
  Card,
  Choice,
  Eyebrow,
  Meter,
  Notice,
  OwnerSheet,
  PrimaryButton,
  QuietButton,
  SceneHeading,
  Segmented,
  Sheet,
  Speech,
  Stat,
  Tile,
  coverageTone,
} from "../ui";
import { useShuffle } from "../shuffle";
import type { SceneProps } from "./handover";

/* ── Three problems, one manager ──────────────────────────────────────── */

type ProblemId = "constraint" | "aisle" | "followUp";

const MODES: { id: TriageMode; label: string }[] = [
  { id: "handle", label: "Do it myself" },
  { id: "delegate", label: "Hand over" },
  { id: "later", label: "After rush" },
];

/** The stages an order depends on, for the screens that list them. */
const ORDER_STAGES: Stage[] = ["picking", "putaway", "riders"];

/**
 * 06:14. Three things at once and one pair of hands.
 *
 * Nobody is asked which matters most. Each problem gets an owner or a
 * postponement, and the order of importance is whatever that adds up to.
 */
export function Triage({ state, act }: SceneProps) {
  const form = formFor(state.form);
  const board = state.triageAt ?? metricsOf(state);
  const closed = state.followUp === "done";
  const riders = form.constraint === "riders";

  const [calls, setCalls] = React.useState<Record<ProblemId, TriageCall | null>>({
    constraint: null,
    aisle: null,
    followUp: closed ? { mode: "later" } : null,
  });
  const [picking, setPicking] = React.useState<ProblemId | null>(null);

  const choose = (id: ProblemId, mode: TriageMode) => {
    setCalls((current) => ({ ...current, [id]: { mode } }));
    if (mode === "delegate") setPicking(id);
  };
  const assign = (id: ProblemId, owner: string) => setCalls((current) => ({ ...current, [id]: { mode: "delegate", owner } }));
  // Backing out of the list without naming anybody is not a delegation.
  const dismiss = () => {
    if (picking && !calls[picking]?.owner) setCalls((current) => ({ ...current, [picking]: null }));
    setPicking(null);
  };

  const handled = Object.values(calls).filter((call) => call?.mode === "handle").length;
  const ready = (Object.keys(calls) as ProblemId[]).every((id) => {
    const call = calls[id];
    return call !== null && (call.mode !== "delegate" || Boolean(call.owner));
  });

  const cover = board.coverage[form.constraint];
  const problems: { id: ProblemId; letter: string; title: string; detail: string; tone: "caution" | "neutral" }[] = [
    {
      id: "constraint",
      letter: "A",
      title: form.surgeHeadline,
      detail: `${STATION_LABEL[form.constraint]} ${riders ? "are" : "is"} at ${pct(cover)} of what is needed. ${board.ordersWaiting} orders waiting. Dispatch time ${board.ctd} sec.`,
      tone: cover < 0.97 ? "caution" : "neutral",
    },
    {
      id: "aisle",
      letter: "B",
      title: "Aisle C is blocked",
      detail: "New crates are stacked across the aisle. Pickers now take 57 sec to walk through, not 38 sec.",
      tone: "caution",
    },
    {
      id: "followUp",
      letter: "C",
      title: `${form.highValue.item}: the missing items`,
      detail: closed
        ? "Reported to loss prevention, and the evidence is kept. Nothing here is waiting for you."
        : state.kase.stage === "deferred"
          ? "Still not counted. Loss prevention has not been told."
          : "Still open. It has not been reported yet.",
      tone: closed ? "neutral" : "caution",
    },
  ];

  return (
    <>
      <SceneHeading eyebrow={`${clockLabel(state.arrivals.triage ?? state.clock)} · Three problems at once`} title="You can only do one of them yourself." />

      <div className="space-y-2.5">
        {problems.map((problem) => {
          const call = calls[problem.id];
          const done = problem.id === "followUp" && closed;
          return (
            <Card key={problem.id} className={cn(problem.tone === "caution" && "border-warn-500/25")}>
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[13px] font-semibold text-mid">
                  {problem.letter}
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-hi">{problem.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{problem.detail}</p>
                </div>
              </div>
              {!done ? (
                <div className="mt-3">
                  <Segmented label={problem.title} value={call?.mode ?? null} options={MODES} onChange={(mode) => choose(problem.id, mode)} />
                  {call?.mode === "delegate" ? (
                    <button
                      type="button"
                      onClick={() => setPicking(problem.id)}
                      className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-line-strong bg-white/[0.03] px-3.5 text-[14px] text-hi"
                    >
                      <span>{call.owner ? `Given to: ${nameOf(call.owner)}` : "Choose who does it"}</span>
                      <span className="text-[12.5px] text-lo">Change</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {handled > 1 ? (
        <Notice tone="caution" className="mt-3">
          You can only be in one place. The first one you do yourself gets done. The others wait until you are free.
        </Notice>
      ) : null}

      <ActionBar note={`Done by you: ${Math.min(handled, 1)} of 1 used`}>
        <PrimaryButton
          disabled={!ready}
          onClick={() =>
            act({
              t: "triage",
              constraint: calls.constraint ?? { mode: "later" },
              aisle: calls.aisle ?? { mode: "later" },
              followUp: calls.followUp ?? { mode: "later" },
            })
          }
        >
          Confirm
        </PrimaryButton>
      </ActionBar>

      <OwnerSheet
        open={picking === "constraint"}
        onOpenChange={dismiss}
        title={riders ? "Rider pickup point" : `Send to ${STATION_LABEL[form.constraint].toLowerCase()}`}
        description={riders ? "Who goes to the rider pickup point to organise the riders?" : "Who do you send? They stay there, with their device locked to that job."}
        options={riders ? ownerOptions(state, "riders") : moverOptions(state, form.constraint as Station)}
        onPick={(owner) => assign("constraint", owner)}
      />
      <OwnerSheet
        open={picking === "aisle"}
        onOpenChange={dismiss}
        title="Clear Aisle C"
        description="Who clears it?"
        options={ownerOptions(state, "aisle")}
        onPick={(owner) => assign("aisle", owner)}
      />
      <OwnerSheet
        open={picking === "followUp"}
        onOpenChange={dismiss}
        title="Put the evidence together"
        description="Who puts the evidence together?"
        options={ownerOptions(state, "followUp")}
        onPick={(owner) => assign("followUp", owner)}
      />
    </>
  );
}

/* ── The bottleneck ───────────────────────────────────────────────────── */

const PANEL_LABEL: Record<string, string> = {
  bnPicking: "Picking",
  bnShelf: "Shelf bins and putaway",
  bnRiders: "Riders",
  bnDevices: "Devices",
  bnAisle: "Aisles",
  bnQueue: "Orders waiting",
};

/**
 * What the candidate can say back: where they think the store is stuck. Whole
 * sentences, because a row of one-word buttons under "What do you tell him?"
 * does not say what is being asked.
 */
const REPLIES: { id: Stage | "aisle" | "unsure" | "holding"; label: string; detail: string }[] = [
  { id: "picking", label: "It’s picking", detail: "Not enough people picking orders." },
  { id: "putaway", label: "It’s putaway", detail: "Bins are running empty." },
  { id: "riders", label: "It’s the riders", detail: "Packed bags are waiting to leave." },
  { id: "aisle", label: "It’s Aisle C", detail: "Pickers are walking around it." },
  { id: "holding", label: "Nothing is stuck", detail: "The store is keeping up." },
  { id: "unsure", label: "I’m not sure yet", detail: "I need to look first." },
];

function people(state: HiringState, station: Station): string {
  const here = Object.keys(state.assign).filter((id) => state.assign[id] === station);
  return here.length ? here.map(nameOf).join(", ") : "Nobody";
}

/** Everybody whose device has a lock on it: on putaway or auditing. */
function devices(state: HiringState): string[] {
  return Object.keys(state.assign).filter((id) => state.assign[id] !== "picking" && !isTemp(id));
}

function PanelBody({ state, panel }: { state: HiringState; panel: string }) {
  const now = metricsOf(state);
  const blocked = aisleBlocked(state);
  const open = devices(state).filter((id) => !isLocked(state, id));
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
      <span className="text-[13.5px] text-mid">{label}</span>
      <span className="tabular text-right text-[14.5px] font-semibold text-hi">{value}</span>
    </div>
  );

  switch (panel) {
    case "bnPicking":
      return (
        <>
          <Meter label="Picking compared to orders, now" value={now.coverage.picking} />
          <div className="mt-3">
            {line("On picking", people(state, "picking"))}
            {line("Unlocked devices doing orders", open.length ? `${open.length} · ${pct(now.pull)} of their time` : "None")}
            {line("Pick speed, all pickers", `${now.ppi.toFixed(1)} sec per item · target ${PPI_TARGET}`)}
            {line("Orders waiting to be picked", Math.round(state.flow.pickQ))}
          </div>
        </>
      );
    case "bnShelf": {
      const gap = Math.max(0, 1 - now.coverage.putaway);
      return (
        <>
          <Meter label="Putaway compared to what is selling, now" value={now.coverage.putaway} />
          <div className="mt-3">
            {line("On putaway", people(state, "putaway"))}
            {line("Empty bins for fast-selling items", Math.round(gap * 46))}
            {line("Putaway tasks not started", 4 + Math.round(gap * 60))}
            {line("Crates still in the receiving area", 64 + Math.round(gap * 40))}
            {line("Putaway order", state.shocks.lanes.includes("putaway") ? "Fast-selling items first" : "In the order they came")}
          </div>
        </>
      );
    }
    case "bnRiders": {
      const on = ridersOn(state);
      const { standby, standbyAt, desk } = state.riders;
      return (
        <>
          <Meter label="Riders compared to bags going out, now" value={now.coverage.riders} />
          <div className="mt-3">
            {line("Riders logged in", `${on} of ${RIDERS_ROSTERED + (standby ? STANDBY_RIDERS : 0)}`)}
            {standby && standbyAt !== null && standbyAt > state.clock ? line("Extra riders", `Coming at ${clockLabel(standbyAt)}`) : null}
            {line("Packed bags waiting for a rider", Math.round(state.flow.stageQ))}
            {line("How bags are given", state.shocks.lanes.includes("riders") ? "Nearby orders grouped, two per rider" : "One order per rider")}
            {line("Rider pickup point", desk ? nameOf(desk) : "Nobody there")}
          </div>
        </>
      );
    }
    case "bnDevices":
      return (
        <>
          <p className="text-[13px] leading-snug text-mid">
            Devices on putaway and checking. When more orders are waiting than the pickers can do, the app sends orders to unlocked devices.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {devices(state).map((id) => {
              const locked = isLocked(state, id);
              return (
                <li key={id} className="flex items-center gap-3 py-2.5">
                  {locked ? <Lock className="size-4 shrink-0 text-lo" aria-hidden /> : <LockOpen className="size-4 shrink-0 text-ion-400" aria-hidden />}
                  <span className="min-w-0 flex-1 text-[14px] font-semibold text-hi">
                    {nameOf(id)}
                    <span className="block text-[12.5px] font-normal text-lo">{STATION_LABEL[state.assign[id]!]}</span>
                  </span>
                  <span className="tabular shrink-0 text-right text-[13px] text-mid">
                    {locked ? "Locked · no orders" : `Unlocked · doing orders ${pct(now.pull)} of the time`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      );
    case "bnAisle":
      return (
        <>
          {line("Aisle C", blocked ? "Blocked by new crates" : "Clear")}
          {line("Walk through Zone C", blocked ? "57 sec" : "38 sec")}
          {line("Other aisles", "Clear")}
        </>
      );
    default:
      return (
        <>
          {line("Waiting to be picked", Math.round(state.flow.pickQ))}
          {line("Packed, waiting for a rider", Math.round(state.flow.stageQ))}
          {line("Dispatch time", `${now.ctd} sec · target ${CTD_TARGET}`)}
        </>
      );
  }
}

function describe(step: Intervention): string {
  switch (step.kind) {
    case "move":
      return `${nameOf(step.emp)} → ${STATION_LABEL[step.to]}`;
    case "lock":
      return `${nameOf(step.emp)}’s device → ${step.locked ? "locked" : "unlocked"}`;
    case "addSlot":
      return PROCESS_FIX[step.station].label;
    case "riderDesk":
      return `${nameOf(step.emp)} → rider pickup point`;
    case "standby":
      return "Call the extra riders";
    case "clearAisle":
      return `Clear Aisle C · ${step.owner === "me" ? "myself" : nameOf(step.owner)}`;
    case "slowRelease":
      return "Slow down new orders";
  }
}

/**
 * 06:18. Orders are backing up and the Floor Lead knows why.
 *
 * He is wrong, in a way that is easy to believe: the pick speed on the wall
 * really is bad when pickers are walking to empty bins. Six panels show what
 * each part of the floor is actually doing — including which devices the app
 * is sending orders to — and any change can be made, run for three minutes,
 * and looked at afterwards. No panel says which stage is the problem and
 * nothing announces whether the change was the right one.
 */
export function Bottleneck({ state, act }: SceneProps) {
  const b = state.bn;
  const now = metricsOf(state);
  const ran = b.ranAt !== null;
  // "Not sure yet" is not a diagnosis, and stays last; the five that are go in this attempt's order.
  const order = useShuffle("floorLead");
  const replies = [...order(REPLIES.filter((reply) => reply.id !== "unsure")), ...REPLIES.filter((reply) => reply.id === "unsure")];

  const [open, setOpen] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Intervention[]>([]);
  const [sheet, setSheet] = React.useState<"station" | "mover" | "aisle" | "device" | "desk" | null>(null);
  const [target, setTarget] = React.useState<Station>("picking");

  const show = (panel: string) => {
    act({ t: "inspect", item: panel });
    setOpen(panel);
  };
  const has = (match: (step: Intervention) => boolean) => draft.some(match) || b.moves.some(match);
  const toggle = (step: Intervention, match: (step: Intervention) => boolean) =>
    setDraft((current) => (current.some(match) ? current.filter((entry) => !match(entry)) : [...current, step]));

  const apply = () => {
    act({ t: "intervene", moves: draft });
    setDraft([]);
  };

  const said = floorLeadSays(b.blamed, b.constraintAtStart);
  const isStandby = (step: Intervention) => step.kind === "standby";
  const isDesk = (step: Intervention) => step.kind === "riderDesk";

  return (
    <>
      <SceneHeading
        eyebrow={`${clockLabel(state.arrivals.bottleneck ?? state.clock)} · The floor`}
        title={b.coverageAtStart && floorHolding(b.coverageAtStart) && now.ctd <= CTD_TARGET ? "The Floor Lead wants to talk to you." : "Orders are piling up."}
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Orders waiting" value={now.ordersWaiting} tone={now.ordersWaiting > 24 ? "caution" : "neutral"} />
        <Stat label="Dispatch time" value={now.ctd} unit="sec" tone={now.ctd > 180 ? "caution" : "neutral"} />
        <Stat label="Pick speed" value={now.ppi.toFixed(1)} unit="sec" tone={now.ppi > 18 ? "caution" : "neutral"} />
      </div>

      <Card className="mt-3">
        <Speech who="Floor Lead" role="what he thinks" lines={[said]} />
      </Card>

      <Eyebrow className="mt-5 mb-2">Check the store · tap to look</Eyebrow>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BN_PANELS.map((panel) => (
          <Tile key={panel} label={PANEL_LABEL[panel]!} opened={b.viewed.includes(panel)} onClick={() => show(panel)} />
        ))}
      </div>

      <Eyebrow className="mt-5 mb-1">Your answer to the Floor Lead</Eyebrow>
      <p className="mb-2 text-[13.5px] leading-snug text-mid">Where is the store stuck? You can change your answer before you move on.</p>
      <div role="radiogroup" aria-label="Where is the store stuck?" className="grid gap-1.5 sm:grid-cols-2">
        {replies.map((reply) => {
          const chosen = b.reply === reply.id;
          return (
            <button
              key={reply.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => act({ t: "floorLeadReply", call: reply.id })}
              className={cn(
                "min-h-[52px] rounded-[12px] border px-3.5 py-2 text-left transition-colors",
                chosen ? "border-ember-500/70 bg-ember-500/[0.1]" : "border-line-strong bg-white/[0.03] hover:border-ember-500/60",
              )}
            >
              <span className="block text-[14px] font-semibold text-hi">“{reply.label}.”</span>
              <span className="block text-[12.5px] leading-snug text-mid">{reply.detail}</span>
            </button>
          );
        })}
      </div>

      {!ran ? (
        <>
          <Eyebrow className="mt-5 mb-2">Change something</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice go onClick={() => setSheet("station")} detail="Choose the job, then who goes there.">
              Move a worker…
            </Choice>
            <Choice go onClick={() => setSheet("device")} detail="Locked: stays on its job. Unlocked: gets orders when it is busy.">
              Lock or unlock a device…
            </Choice>
            {(["putaway", "riders", "auditing"] as Stage[]).map((stage) => {
              const match = (step: Intervention) => step.kind === "addSlot" && step.station === stage;
              return (
                <Choice
                  key={stage}
                  selected={has(match)}
                  disabled={b.moves.some(match)}
                  onClick={() => toggle({ kind: "addSlot", station: stage }, match)}
                  detail={PROCESS_FIX[stage].detail}
                >
                  {PROCESS_FIX[stage].label}
                </Choice>
              );
            })}
            {!state.riders.desk ? (
              <Choice
                selected={draft.some(isDesk)}
                onClick={() => (draft.some(isDesk) ? setDraft((current) => current.filter((step) => !isDesk(step))) : setSheet("desk"))}
                detail="Someone at the rider pickup point to organise riders and bags. They leave their own work."
              >
                Put someone at the rider pickup point…
              </Choice>
            ) : null}
            {!state.riders.standby ? (
              <Choice
                selected={draft.some(isStandby)}
                onClick={() => toggle({ kind: "standby" }, isStandby)}
                detail={`${STANDBY_RIDERS} riders from the rider company, ₹300. They take about 8 minutes to come.`}
              >
                Call the extra riders
              </Choice>
            ) : null}
            {aisleBlocked(state) && !b.moves.some((step) => step.kind === "clearAisle") ? (
              <Choice selected={draft.some((step) => step.kind === "clearAisle")} onClick={() => (draft.some((step) => step.kind === "clearAisle") ? setDraft((current) => current.filter((step) => step.kind !== "clearAisle")) : setSheet("aisle"))} detail={PROCESS_FIX.picking.detail}>
                Clear Aisle C
              </Choice>
            ) : null}
            <Choice
              selected={has((step) => step.kind === "slowRelease")}
              disabled={b.moves.some((step) => step.kind === "slowRelease")}
              onClick={() => toggle({ kind: "slowRelease" }, (step) => step.kind === "slowRelease")}
              detail="Hold back new orders for 10 minutes. Customers see a longer delivery time."
            >
              Slow down new orders
            </Choice>
          </div>

          {draft.length || b.moves.length ? (
            <Card className="mt-3">
              <Eyebrow className="mb-2">Your changes</Eyebrow>
              <ul className="space-y-1.5">
                {b.moves.map((step, index) => (
                  <li key={`done-${index}`} className="flex items-center gap-2 text-[14px] text-mid">
                    <span className="size-1.5 shrink-0 rounded-full bg-white/40" />
                    {describe(step)} <span className="text-[12px] text-lo">· done</span>
                  </li>
                ))}
                {draft.map((step, index) => (
                  <li key={`draft-${index}`} className="flex items-center gap-2 text-[14px] text-hi">
                    <span className="size-1.5 shrink-0 rounded-full bg-ember-500" />
                    <span className="min-w-0 flex-1">{describe(step)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${describe(step)}`}
                      onClick={() => setDraft((current) => current.filter((_, at) => at !== index))}
                      className="grid size-9 place-items-center rounded-full text-lo hover:bg-white/[0.07] hover:text-hi"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {draft.length ? (
                <QuietButton className="mt-3" onClick={apply}>
                  Make {draft.length === 1 ? "this change" : `these ${draft.length} changes`}
                </QuietButton>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="mt-5">
          <Eyebrow className="mb-2">{clockLabel(b.ranAt!)} · 3 minutes later</Eyebrow>
          {b.effectChecked && b.before && b.after ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["Dispatch", b.before.ctd, b.after.ctd, "sec"],
                    ["Waiting", b.before.ordersWaiting, b.after.ordersWaiting, ""],
                    ["Bags waiting", b.before.staged, b.after.staged, ""],
                  ] as const
                ).map(([label, before, after, unit]) => (
                  <div key={label} className="rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5">
                    <p className="font-mono text-[11px] tracking-[0.14em] text-lo uppercase">{label}</p>
                    <p className="tabular mt-1 flex items-center gap-1 text-[15px] font-semibold text-hi">
                      <span className="text-lo">{before}</span>
                      <ArrowRight className="size-3 text-lo" aria-hidden />
                      {after}
                      {unit ? <span className="text-[11.5px] font-medium text-lo">{unit}</span> : null}
                    </p>
                  </div>
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {ORDER_STAGES.map((stage) => (
                  <li key={stage} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="text-mid">{STATION_LABEL[stage]}</span>
                    <span className="tabular font-semibold">
                      <span className="text-lo">{pct(b.before!.coverage[stage])}</span>
                      <span className="mx-1.5 text-lo">→</span>
                      <span className={{ good: "text-ion-400", caution: "text-warn-500", critical: "text-alert-500", neutral: "text-hi" }[coverageTone(b.after!.coverage[stage])]}>
                        {pct(b.after!.coverage[stage])}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Tile label="Check the store" detail="See what changed in the last 3 minutes." onClick={() => act({ t: "inspect", item: "bnEffect" })} />
          )}
        </Card>
      )}

      <ActionBar>
        {ran ? (
          <PrimaryButton onClick={() => act({ t: "next" })}>Continue</PrimaryButton>
        ) : (
          <>
            <QuietButton onClick={() => act({ t: "next" })}>Move on</QuietButton>
            <PrimaryButton disabled={draft.length > 0} onClick={() => act({ t: "runSystem" })}>
              Let 3 minutes pass
            </PrimaryButton>
          </>
        )}
      </ActionBar>

      <Sheet open={open !== null} onOpenChange={() => setOpen(null)} title={open ? PANEL_LABEL[open]! : ""} description={`At ${clockLabel(state.clock)}`}>
        {open ? <PanelBody state={state} panel={open} /> : null}
      </Sheet>

      <Sheet open={sheet === "station"} onOpenChange={() => setSheet(null)} title="Move a worker" description="To which job?">
        <div className="grid gap-2">
          {STATIONS.map((station) => (
            <Choice
              go
              key={station}
              onClick={() => {
                setTarget(station);
                setSheet("mover");
              }}
            >
              {STATION_LABEL[station]}
            </Choice>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-lo">When you move someone to a new job, their device becomes unlocked.</p>
      </Sheet>
      <OwnerSheet
        open={sheet === "mover"}
        onOpenChange={() => setSheet(null)}
        title={`Move to ${STATION_LABEL[target].toLowerCase()}`}
        description="Who do you move?"
        options={moverOptions(state, target).filter((option) => !draft.some((step) => step.kind === "move" && step.emp === option.id))}
        onPick={(emp) => setDraft((current) => [...current, { kind: "move", emp, to: target }])}
      />
      <Sheet open={sheet === "device"} onOpenChange={() => setSheet(null)} title="Devices" description="Tap a device to lock or unlock it.">
        <ul className="grid gap-1.5">
          {devices(state)
            .filter((id) => id !== "riya")
            .map((id) => {
              const pending = draft.find((step) => step.kind === "lock" && step.emp === id);
              const locked = pending && pending.kind === "lock" ? pending.locked : isLocked(state, id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !locked;
                      setDraft((current) => {
                        const rest = current.filter((step) => !(step.kind === "lock" && step.emp === id));
                        // Putting it back the way it was is no change at all.
                        return next === isLocked(state, id) ? rest : [...rest, { kind: "lock", emp: id, locked: next }];
                      });
                    }}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-[12px] border border-line-strong bg-white/[0.03] px-3.5 text-left transition-colors hover:border-ember-500/60"
                  >
                    {locked ? <Lock className="size-4 shrink-0 text-lo" aria-hidden /> : <LockOpen className="size-4 shrink-0 text-ion-400" aria-hidden />}
                    <span className="min-w-0 flex-1 text-[14px] font-semibold text-hi">
                      {nameOf(id)}
                      <span className="block text-[12.5px] font-normal text-lo">{STATION_LABEL[state.assign[id]!]}</span>
                    </span>
                    <span className={cn("shrink-0 text-[13px]", pending ? "font-semibold text-ember-500" : "text-mid")}>{locked ? "Locked" : "Unlocked"}</span>
                  </button>
                </li>
              );
            })}
        </ul>
        <QuietButton className="mt-4" onClick={() => setSheet(null)}>
          Done
        </QuietButton>
      </Sheet>
      <OwnerSheet
        open={sheet === "desk"}
        onOpenChange={() => setSheet(null)}
        title="Rider pickup point"
        description="Who goes to the rider pickup point?"
        options={ownerOptions(state, "riders")}
        onPick={(emp) => setDraft((current) => [...current.filter((step) => step.kind !== "riderDesk"), { kind: "riderDesk", emp }])}
      />
      <OwnerSheet
        open={sheet === "aisle"}
        onOpenChange={() => setSheet(null)}
        title="Clear Aisle C"
        description="Who clears it?"
        options={ownerOptions(state, "aisle")}
        self={{ note: PERSONAL_COST.aisle }}
        onPick={(owner) => setDraft((current) => [...current, { kind: "clearAisle", owner }])}
      />
    </>
  );
}
