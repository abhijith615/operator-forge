"use client";

import * as React from "react";
import { Minus, Plus, Search } from "lucide-react";

import {
  CASE_STEPS,
  CASE_TOOL_LABEL,
  CONTROL_FIXES,
  NIL_SOURCE_LABEL,
  UNIT_CALLS,
  caseRecords,
  nilRecords,
} from "@/lib/hiring/content";
import {
  CASE_TOOLS,
  NIL_SOURCES,
  countKnown,
  interruptDue,
  nilFound,
  pendingUntil,
  recordsSeen,
} from "@/lib/hiring/engine";
import { formFor } from "@/lib/hiring/forms";
import { clockLabel, metricsOf } from "@/lib/hiring/model";
import { STATION_LABEL, nameOf } from "@/lib/hiring/roster";
import type { CaseStep, ControlFix, UnitCall } from "@/lib/hiring/types";
import { PERSONAL_COST, moverOptions, ownerOptions } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";

import { ItemPhoto } from "../item-photo";

import {
  ActionBar,
  Card,
  Choice,
  Eyebrow,
  Notice,
  OwnerSheet,
  PrimaryButton,
  QuietButton,
  Records,
  SceneHeading,
  Sheet,
  Stat,
  Tile,
} from "../ui";
import type { SceneProps } from "./handover";

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/* ── The high-value variance ──────────────────────────────────────────── */

/**
 * A system number and a cage nobody has looked in.
 *
 * Counting, reading the records and closing the case are all available from
 * the first second, in any order, by the manager or by somebody sent. None of
 * the records says what happened; each shows what was recorded, including the
 * lines where nothing was.
 */
export function HighValueCase({ state, act }: SceneProps) {
  const form = formFor(state.form);
  const hv = form.highValue;
  const k = state.kase;
  const known = countKnown(state);
  const seen = recordsSeen(state);
  const records = React.useMemo(() => caseRecords(state.form), [state.form]);

  const [sheet, setSheet] = React.useState<"count" | "records" | "handOver" | "stepOut" | null>(null);
  const [reading, setReading] = React.useState<string | null>(null);
  const [closing, setClosing] = React.useState(false);

  const interrupted = interruptDue(state);
  const now = metricsOf(state);
  const waitingOn = pendingUntil(state);

  const openTool = (tool: string) => {
    if (!seen.includes(tool)) act({ t: "inspect", item: tool });
    setReading(tool);
  };

  if (closing) return <Disposition state={state} act={act} onBack={() => setClosing(false)} />;

  return (
    <>
      <SceneHeading
        eyebrow={`${clockLabel(k.openedAt)} · High-value alert`}
        title={hv.item}
        media={<ItemPhoto id={hv.photo} alt={hv.item} />}
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="System" value={hv.system} />
        <Stat label="Physical" value={known ? hv.physical : "?"} tone={known ? "caution" : "neutral"} />
        <Stat label="Unit value" value={inr(hv.unitValue)} />
      </div>
      {known ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Variance" value={`−${hv.system - hv.physical}`} tone="caution" />
          <Stat label="Exposure" value={inr((hv.system - hv.physical) * hv.unitValue)} tone="caution" />
        </div>
      ) : null}

      <Card className="mt-3">
        <Eyebrow className="mb-2">Physical count</Eyebrow>
        {k.countOwner === null ? (
          <QuietButton onClick={() => setSheet("count")}>Start a count</QuietButton>
        ) : known ? (
          <p className="text-[14.5px] text-hi">
            Counted by {k.countOwner === "me" ? "you" : nameOf(k.countOwner)} at {clockLabel(k.countDoneAt!)}: <span className="font-semibold">{hv.physical}</span> in the cage.
          </p>
        ) : (
          <p className="text-[14.5px] text-mid">
            {nameOf(k.countOwner)} is counting the cage. Back at {clockLabel(k.countDoneAt!)}.
          </p>
        )}
      </Card>

      <Eyebrow className="mt-5 mb-2">Records</Eyebrow>
      {k.recordsOwner && !seen.includes("exception") ? (
        <Notice className="mb-2">
          {nameOf(k.recordsOwner)} is pulling the records. Back at {clockLabel(k.recordsDoneAt!)}.
        </Notice>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {CASE_TOOLS.map((tool) => (
          <Tile key={tool} label={CASE_TOOL_LABEL[tool]!} opened={seen.includes(tool)} onClick={() => openTool(tool)} />
        ))}
      </div>
      {!k.recordsOwner && seen.length < CASE_TOOLS.length ? (
        <QuietButton className="mt-2" onClick={() => setSheet("records")}>
          Assign the record pull
        </QuietButton>
      ) : null}

      <ActionBar>
        {k.countOwner === null ? (
          <QuietButton onClick={() => act({ t: "deferCase" })}>Defer to audit</QuietButton>
        ) : waitingOn !== null ? (
          <QuietButton onClick={() => act({ t: "wait" })}>Wait · {clockLabel(waitingOn)}</QuietButton>
        ) : null}
        <PrimaryButton disabled={k.countOwner === null} onClick={() => setClosing(true)}>
          Close the case
        </PrimaryButton>
      </ActionBar>

      <OwnerSheet
        open={sheet === "count"}
        onOpenChange={() => setSheet(null)}
        title={`${hv.item} recount`}
        description="Who counts the cage?"
        options={ownerOptions(state, "count")}
        self={{ note: PERSONAL_COST.count }}
        onPick={(owner) => act({ t: "startCount", owner })}
      />
      <OwnerSheet
        open={sheet === "records"}
        onOpenChange={() => setSheet(null)}
        title="Record pull"
        description="Who pulls all five records for you?"
        options={ownerOptions(state, "records")}
        onPick={(owner) => act({ t: "pullRecords", owner })}
      />

      <Sheet
        open={reading !== null}
        onOpenChange={() => setReading(null)}
        title={reading ? CASE_TOOL_LABEL[reading]! : ""}
        description={reading ? records[reading]?.note : undefined}
      >
        {reading && records[reading] ? <Records rows={records[reading]!.rows} /> : null}
      </Sheet>

      {/* 06:09 — the morning arrives while the manager is in the cage. */}
      <Sheet
        open={interrupted && sheet === null && reading === null}
        onOpenChange={() => undefined}
        dismissable={false}
        title={form.surgeAlert}
        description={form.surgeDetail}
      >
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Orders waiting" value={now.ordersWaiting} tone="caution" />
          <Stat label="CTD" value={now.ctd} unit="sec" tone={now.ctd > 180 ? "caution" : "neutral"} />
        </div>
        <div className="mt-4 grid gap-2">
          <Choice go onClick={() => act({ t: "caseInterrupt", choice: "stay" })}>Continue the investigation personally</Choice>
          {!k.recordsOwner ? (
            <Choice go onClick={() => setSheet("handOver")} detail="Somebody else finishes the records. You stay available.">
              Hand the record pull to…
            </Choice>
          ) : null}
          <Choice go onClick={() => setSheet("stepOut")} detail={form.constraint === "riders" ? "Step out and put somebody on the rider handover." : `Step out and put somebody on ${STATION_LABEL[form.constraint].toLowerCase()}.`}>
            Return to the floor
          </Choice>
        </div>
      </Sheet>
      <OwnerSheet
        open={sheet === "handOver"}
        onOpenChange={() => setSheet(null)}
        title="Hand over the record pull"
        options={ownerOptions(state, "records")}
        onPick={(owner) => act({ t: "caseInterrupt", choice: "handOver", owner })}
      />
      <OwnerSheet
        open={sheet === "stepOut"}
        onOpenChange={() => setSheet(null)}
        title={form.constraint === "riders" ? "Rider handover" : `Send to ${STATION_LABEL[form.constraint].toLowerCase()}`}
        description={form.constraint === "riders" ? "Who goes to the handover point?" : "Who do you send? They stay on it."}
        options={form.constraint === "riders" ? ownerOptions(state, "riders") : moverOptions(state, form.constraint)}
        onPick={(move) => act({ t: "caseInterrupt", choice: "stepOut", move })}
      />
    </>
  );
}

const PILES: UnitCall[] = ["explained", "recovered", "unresolved", "writeoff", "theft"];

function Disposition({ state, act, onBack }: SceneProps & { onBack: () => void }) {
  const hv = formFor(state.form).highValue;
  const short = hv.system - hv.physical;
  const [piles, setPiles] = React.useState<Record<UnitCall, number>>({ explained: 0, recovered: 0, unresolved: 0, writeoff: 0, theft: 0 });
  const [steps, setSteps] = React.useState<CaseStep[]>([]);
  const [controls, setControls] = React.useState<ControlFix[]>([]);

  const placed = PILES.reduce((sum, pile) => sum + piles[pile], 0);
  const bump = (pile: UnitCall, by: number) =>
    setPiles((current) => {
      const next = current[pile] + by;
      if (next < 0 || (by > 0 && placed >= short)) return current;
      return { ...current, [pile]: next };
    });
  const flip = <T extends string>(list: T[], id: T, max = 99): T[] =>
    list.includes(id) ? list.filter((entry) => entry !== id) : list.length < max ? [...list, id] : list;

  const submit = () => {
    const units = PILES.flatMap((pile) => Array<UnitCall>(piles[pile]).fill(pile)) as [UnitCall, UnitCall, UnitCall];
    act({ t: "disposition", units, steps, controls });
  };

  return (
    <>
      <SceneHeading eyebrow="Close the case" title={`${short} units short. How do you account for them?`} />

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <Eyebrow>Place each unit</Eyebrow>
          <span className="tabular text-[13px] text-mid">
            {placed} of {short} placed
          </span>
        </div>
        <ul className="space-y-1.5">
          {UNIT_CALLS.map((pile) => (
            <li key={pile.id} className="flex items-center gap-3 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2">
              <span className="min-w-0 flex-1 text-[14.5px] font-medium text-hi">{pile.label}</span>
              <button
                type="button"
                aria-label={`One fewer ${pile.label}`}
                disabled={piles[pile.id] === 0}
                onClick={() => bump(pile.id, -1)}
                className="grid size-11 place-items-center rounded-full border border-line-strong text-hi disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className={cn("tabular w-5 text-center text-[17px] font-semibold", piles[pile.id] ? "text-ember-500" : "text-lo")}>{piles[pile.id]}</span>
              <button
                type="button"
                aria-label={`One more ${pile.label}`}
                disabled={placed >= short}
                onClick={() => bump(pile.id, 1)}
                className="grid size-11 place-items-center rounded-full border border-line-strong text-hi disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Eyebrow className="mt-5 mb-2">What happens next</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {CASE_STEPS.map((step) => (
          <Choice key={step.id} selected={steps.includes(step.id)} onClick={() => setSteps((current) => flip(current, step.id))}>
            {step.label}
          </Choice>
        ))}
      </div>

      <Eyebrow className="mt-5 mb-2">Change to the process · up to two</Eyebrow>
      <div className="grid gap-2">
        {CONTROL_FIXES.map((fix) => (
          <Choice
            key={fix.id}
            selected={controls.includes(fix.id)}
            disabled={!controls.includes(fix.id) && controls.length >= 2}
            onClick={() => setControls((current) => flip(current, fix.id, 2))}
          >
            {fix.label}
          </Choice>
        ))}
      </div>

      <ActionBar>
        <QuietButton onClick={onBack}>Back</QuietButton>
        <PrimaryButton disabled={placed !== short} onClick={submit}>
          Close the case
        </PrimaryButton>
      </ActionBar>
    </>
  );
}

/* ── Nil pick ─────────────────────────────────────────────────────────── */

/**
 * A fast line the system says is in stock, and an empty face.
 *
 * Authorising the nil pick clears the order in seconds, and is right there.
 */
export function NilPick({ state, act }: SceneProps) {
  const form = formFor(state.form);
  const nil = form.nilPick;
  const n = state.nil;
  const records = React.useMemo(() => nilRecords(state.form), [state.form]);
  const [reading, setReading] = React.useState<string | null>(null);
  const [sheet, setSheet] = React.useState<"search" | "restock" | null>(null);

  const found = nilFound(state);
  const searching = n.searchOwner !== null && n.searchDoneAt !== null && n.searchDoneAt > state.clock;
  const searched = n.searchOwner !== null && !searching;

  const openSource = (source: string) => {
    if (!n.viewed.includes(source)) act({ t: "inspect", item: source });
    setReading(source);
  };

  return (
    <>
      <SceneHeading
        eyebrow={`${clockLabel(state.arrivals.nilpick ?? state.clock)} · Nil pick reported`}
        title={nil.item}
        sub={`Order ${nil.order} is waiting on it.`}
        media={<ItemPhoto id={nil.photo} alt={nil.item} />}
      />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="System" value={nil.system} />
        <Stat label="In the bin" value={0} tone="caution" />
      </div>

      <Eyebrow className="mt-5 mb-2">Look for it</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {NIL_SOURCES.map((source) => (
          <Tile key={source} label={NIL_SOURCE_LABEL[source]!} opened={n.viewed.includes(source)} onClick={() => openSource(source)} />
        ))}
      </div>

      {n.searchOwner === null ? (
        <QuietButton className="mt-2" onClick={() => setSheet("search")}>
          <Search className="size-4" aria-hidden />
          Send someone to search
        </QuietButton>
      ) : searching ? (
        <Notice className="mt-2">
          {nameOf(n.searchOwner)} is searching. Back at {clockLabel(n.searchDoneAt!)}.
        </Notice>
      ) : null}

      {found && (searched || n.viewed.includes("replenArea")) ? (
        <Notice tone="good" className="mt-2">
          {nil.system} units are in a crate on the inward dock, received at 04:30 and not put away.
        </Notice>
      ) : null}

      <Eyebrow className="mt-5 mb-2">Decide</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        <Choice go disabled={!found} onClick={() => setSheet("restock")} detail={found ? "Fill the bin and ship the order complete." : "Nothing found to put away yet."}>
          Put the crate away
        </Choice>
        <Choice go onClick={() => act({ t: "nilResolve", how: "authorise" })} detail="Ship the order without it. Refund the line.">
          Authorise the nil pick
        </Choice>
        <Choice go onClick={() => act({ t: "nilResolve", how: "delist" })} detail="Take the item off sale in the app.">
          De-list the item
        </Choice>
        <Choice go onClick={() => act({ t: "nilResolve", how: "ignore" })} detail="Leave it with the picker.">
          Ignore
        </Choice>
      </div>

      {searching ? (
        <ActionBar>
          <QuietButton onClick={() => act({ t: "wait" })}>Wait · {clockLabel(n.searchDoneAt!)}</QuietButton>
        </ActionBar>
      ) : null}

      <OwnerSheet
        open={sheet === "search"}
        onOpenChange={() => setSheet(null)}
        title={`Find the ${nil.item}`}
        description="Who searches the store?"
        options={ownerOptions(state, "search")}
        self={{ note: PERSONAL_COST.search }}
        onPick={(owner) => act({ t: "nilSearch", owner })}
      />
      <OwnerSheet
        open={sheet === "restock"}
        onOpenChange={() => setSheet(null)}
        title={`Put away the ${nil.item}`}
        description="Who gets it into the bin?"
        options={ownerOptions(state, "replenish")}
        self={{ note: PERSONAL_COST.replenish }}
        onPick={(owner) => act({ t: "nilResolve", how: "replenish", owner })}
      />

      <Sheet open={reading !== null} onOpenChange={() => setReading(null)} title={reading ? NIL_SOURCE_LABEL[reading]! : ""}>
        {reading && records[reading] ? <Records rows={records[reading]!} /> : null}
      </Sheet>
    </>
  );
}
