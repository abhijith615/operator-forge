"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

import { BAG_ITEMS, LATE_ORDER_FIXES } from "@/lib/hiring/content";
import { formFor } from "@/lib/hiring/forms";
import { bagClock } from "@/lib/hiring/engine";
import { CTD_TARGET, clockLabel } from "@/lib/hiring/model";
import { BY_ID, STATION_LABEL, nameOf } from "@/lib/hiring/roster";
import { STATIONS, type Bucket, type LateOrderFix, type PlanEntry, type Station } from "@/lib/hiring/types";
import { PERSONAL_COST, moverOptions, ownerOptions } from "@/lib/hiring/view";
import { cn } from "@/lib/utils";

import {
  ActionBar,
  Card,
  Choice,
  Eyebrow,
  OwnerSheet,
  PrimaryButton,
  QuietButton,
  SceneHeading,
  Segmented,
  Stat,
} from "../ui";
import { useShuffle } from "../shuffle";
import type { SceneProps } from "./handover";

/* ── The bag ──────────────────────────────────────────────────────────── */

type BagItem = (typeof BAG_ITEMS)[number]["id"];

/**
 * 06:23, the staging shelf. A packed-and-ready order with a toilet cleaner
 * sitting on loose coriander, and a dispatch clock two seconds inside target.
 *
 * The bag is rearranged by hand. Nothing marks any arrangement as the safe
 * one, and sending it as it is costs nothing on the clock.
 */
export function CustomerBag({ state, act }: SceneProps) {
  const [where, setWhere] = React.useState<Record<BagItem, 1 | 2>>({ cleaner: 1, coriander: 1, apples: 1 });
  const [liner, setLiner] = React.useState(false);
  const [asking, setAsking] = React.useState(false);

  const { now, penalty } = bagClock(state);
  const changed = liner || Object.values(where).some((bag) => bag === 2);
  // "Separate" means the cleaner shares a bag with no food, whichever bag that is.
  const separate = BAG_ITEMS.every((item) => item.kind !== "food" || where[item.id] !== where.cleaner);

  const move = (id: BagItem) => setWhere((current) => ({ ...current, [id]: current[id] === 1 ? 2 : 1 }));
  const send = (by: string) => act({ t: "bag", cleanerBag: separate ? 2 : 1, cleanerLiner: liner, by });

  return (
    <>
      <SceneHeading eyebrow={`${clockLabel(state.arrivals.customer ?? state.clock)} · Rider shelf`} title="This bag goes out next." sub="The picker packed it. It is waiting for a rider. Tap an item to move it to the other bag." />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="This order so far" value={now} unit={`sec · target ${CTD_TARGET}`} />
        <Stat label="If packed again" value={changed ? now + penalty : "—"} unit={changed ? "sec" : undefined} tone={changed && now + penalty > CTD_TARGET ? "caution" : "neutral"} />
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {([1, 2] as const).map((bag) => {
          const items = BAG_ITEMS.filter((item) => where[item.id] === bag);
          return (
            <Card key={bag} className="min-h-[148px] p-3.5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-lo" aria-hidden />
                <Eyebrow>{bag === 1 ? "Bag 1" : "Extra bag"}</Eyebrow>
              </div>
              <ul className="mt-3 space-y-1.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => move(item.id)}
                      className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[12px] border border-line-strong bg-white/[0.035] px-3.5 text-left transition-colors hover:border-ember-500/60 hover:bg-ember-500/[0.07]"
                    >
                      <span className="text-[14.5px] font-semibold text-hi">
                        {item.label}
                        {item.id === "cleaner" && liner ? <span className="ml-2 text-[12px] font-medium text-mid">in inner bag</span> : null}
                      </span>
                      <span className="text-[12px] text-lo">Move</span>
                    </button>
                  </li>
                ))}
                {items.length === 0 ? <li className="py-3 text-[13px] text-lo">Empty</li> : null}
              </ul>
            </Card>
          );
        })}
      </div>

      <div className="mt-2.5">
        <Choice selected={liner} onClick={() => setLiner((current) => !current)} detail="Put the cleaner in a sealed inner bag.">
          Use an inner bag
        </Choice>
      </div>

      <ActionBar>
        {changed ? (
          <>
            <QuietButton onClick={() => send("unchanged")}>Send it as it was</QuietButton>
            <PrimaryButton onClick={() => setAsking(true)}>Pack it again</PrimaryButton>
          </>
        ) : (
          <PrimaryButton onClick={() => send("unchanged")}>Send it as it is</PrimaryButton>
        )}
      </ActionBar>

      <OwnerSheet
        open={asking}
        onOpenChange={setAsking}
        title="Pack the bag again"
        description="Who does it?"
        options={ownerOptions(state, "repack")}
        self={{ note: PERSONAL_COST.repack }}
        onPick={send}
      />
    </>
  );
}

/* ── The final call ───────────────────────────────────────────────────── */

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "now", label: "Do it myself" },
  { id: "delegate", label: "Hand over" },
  { id: "later", label: "After rush" },
];

const WHERE: Record<string, string> = {
  count: "Counting the cage",
  records: "Getting the records",
  search: "Searching for stock",
  replenish: "Putting a crate on the shelf",
  aisle: "Clearing Aisle C",
  repack: "Packing a bag again",
  riders: "Rider pickup point",
  followUp: "Missing stock follow-up",
  coaching: "Training someone",
};

/**
 * 06:27. The peak starts in three minutes and this is the team that exists.
 *
 * Every open task goes into one of three places, three at most in the first
 * two. The people on offer are the people the candidate put where they are.
 */
export function FinalCall({ state, act }: SceneProps) {
  const form = formFor(state.form);
  const tasks = state.tasksOffered;
  const [plan, setPlan] = React.useState<Record<string, PlanEntry>>({});
  const [picking, setPicking] = React.useState<string | null>(null);
  const order = useShuffle("lateOrder");

  const count = (bucket: Bucket) => Object.values(plan).filter((entry) => entry.bucket === bucket).length;
  const set = (id: string, bucket: Bucket) => {
    setPlan((current) => ({ ...current, [id]: { bucket, fix: current[id]?.fix } }));
    if (bucket === "delegate") setPicking(id);
  };
  const dismiss = () => {
    if (picking && !plan[picking]?.owner) {
      setPlan((current) => {
        const rest = { ...current };
        delete rest[picking];
        return rest;
      });
    }
    setPicking(null);
  };

  const ready = tasks.every((task) => {
    const entry = plan[task.id];
    if (!entry) return false;
    if (entry.bucket === "delegate" && !entry.owner) return false;
    if (task.id === "lateOrder" && entry.bucket !== "later" && !entry.fix) return false;
    return true;
  });

  const active = picking ? tasks.find((task) => task.id === picking) : undefined;
  const taken = new Set(Object.entries(plan).filter(([id, entry]) => entry.bucket === "delegate" && id !== picking).map(([, entry]) => entry.owner));
  const options = !active
    ? []
    : (active.id === "constraint"
        ? form.constraint === "riders"
          ? ownerOptions(state, "riders")
          : moverOptions(state, form.constraint as Station)
        : active.kind
          ? ownerOptions(state, active.kind)
          : []
      ).filter(
        (option) => !taken.has(option.id),
      );

  return (
    <>
      <SceneHeading eyebrow={`${clockLabel(state.arrivals.final ?? state.clock)} · The rush starts now`} title="Your final plan." />

      <Card className="p-3.5">
        <Eyebrow className="mb-2">Your team, now</Eyebrow>
        <ul className="divide-y divide-line">
          {STATIONS.map((station) => {
            const here = state.teamAtFinal.filter((member) => member.where === station);
            const load = here[0]?.load;
            return (
              <li key={station} className="flex items-baseline gap-3 py-2.5">
                <span className="w-24 shrink-0 text-[13.5px] font-semibold text-hi">{STATION_LABEL[station].split(" /")[0]}</span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-mid">
                  {here.length ? here.map((member) => BY_ID[member.id]?.name ?? "Agency picker").join(", ") : "Nobody"}
                </span>
                {/* Auditing gives way to orders in a rush by design; a load figure for it would only mislead. */}
                {load !== undefined && station !== "auditing" ? (
                  <span className={cn("tabular shrink-0 text-[13.5px] font-semibold", load > 100 ? "text-warn-500" : "text-mid")}>{load}% load</span>
                ) : null}
              </li>
            );
          })}
          {state.teamAtFinal
            .filter((member) => !STATIONS.includes(member.where as Station))
            .map((member) => (
              <li key={member.id} className="flex items-baseline gap-3 py-2.5">
                <span className="w-24 shrink-0 text-[13.5px] font-semibold text-hi">{BY_ID[member.id]?.name ?? "Agency picker"}</span>
                <span className="min-w-0 flex-1 text-[13.5px] text-mid">{WHERE[member.where.replace("plan:", "")] ?? "On a task"}</span>
                <span className="shrink-0 text-[12.5px] text-lo">away from their job</span>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-[12px] text-lo">Load shows how busy each job is. Over 100% means it is falling behind.</p>
      </Card>

      <Eyebrow className="mt-5 mb-2">Tasks still open · choose for each one</Eyebrow>
      <div className="space-y-2.5">
        {tasks.map((task) => {
          const entry = plan[task.id];
          return (
            <Card key={task.id}>
              <p className="text-[16px] font-semibold text-hi">{task.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-mid">{task.detail}</p>
              <div className="mt-3">
                <Segmented
                  label={task.title}
                  value={entry?.bucket ?? null}
                  options={BUCKETS.map((bucket) => ({
                    ...bucket,
                    disabled: bucket.id !== "later" && entry?.bucket !== bucket.id && count(bucket.id) >= 3,
                  }))}
                  onChange={(bucket) => set(task.id, bucket)}
                />
              </div>
              {entry?.bucket === "delegate" ? (
                <button
                  type="button"
                  onClick={() => setPicking(task.id)}
                  className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-line-strong bg-white/[0.03] px-3.5 text-[14px] text-hi"
                >
                  <span>{entry.owner ? `Given to: ${nameOf(entry.owner)}` : "Choose who does it"}</span>
                  <span className="text-[12.5px] text-lo">Change</span>
                </button>
              ) : null}
              {task.id === "lateOrder" && entry && entry.bucket !== "later" ? (
                <div className="mt-2 grid gap-1.5">
                  {order(LATE_ORDER_FIXES).map((fix) => (
                    <Choice
                      key={fix.id}
                      selected={entry.fix === fix.id}
                      onClick={() => setPlan((current) => ({ ...current, lateOrder: { ...current.lateOrder!, fix: fix.id as LateOrderFix } }))}
                    >
                      {fix.label}
                    </Choice>
                  ))}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <ActionBar note={`Myself ${count("now")} of 3 · Handed over ${count("delegate")} of 3`}>
        <PrimaryButton disabled={!ready} onClick={() => act({ t: "plan", tasks: plan })}>
          Confirm the plan
        </PrimaryButton>
      </ActionBar>

      <OwnerSheet
        open={active !== undefined}
        onOpenChange={dismiss}
        title={active?.title ?? ""}
        description="Who does it?"
        options={options}
        onPick={(owner) => picking && setPlan((current) => ({ ...current, [picking]: { ...current[picking], bucket: "delegate", owner } }))}
      />
    </>
  );
}

/* ── What happened ────────────────────────────────────────────────────── */

const TONE: Record<string, string> = {
  good: "border-ion-500/35 text-ion-400",
  warn: "border-warn-500/35 text-warn-500",
  bad: "border-alert-500/35 text-alert-500",
  neutral: "border-line-strong text-mid",
};

/**
 * 06:30 to 06:50, in a dozen seconds.
 *
 * The plan is locked and nothing more can be done. What plays is what the
 * store did with the team, the floor and the decisions it was given.
 */
export function Outcome({ state, act }: SceneProps) {
  const reduced = useReducedMotion();
  const outcome = state.outcome;
  const events = React.useMemo(() => outcome?.events ?? [], [outcome]);
  const [shown, setShown] = React.useState(reduced ? events.length + 1 : 0);

  React.useEffect(() => {
    if (shown > events.length) return;
    const timer = window.setTimeout(() => setShown((current) => current + 1), shown === 0 ? 900 : 2200);
    return () => window.clearTimeout(timer);
  }, [shown, events.length]);

  if (!outcome) return null;
  const finished = shown > events.length;
  const clock = finished ? "06:50" : shown === 0 ? "06:30" : clockLabel(events[Math.min(shown, events.length) - 1]!.clock);

  return (
    <>
      <header className="mb-5 text-center">
        <Eyebrow className="text-ember-500">Store 114 · the rush</Eyebrow>
        <p className="tabular mt-2 font-mono text-[44px] leading-none font-semibold tracking-[-0.03em] text-hi" aria-live="polite">
          {clock}
        </p>
      </header>

      <ol className="space-y-2">
        {events.slice(0, shown).map((event, index) => (
          <motion.li
            key={`${event.clock}-${index}`}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={cn("flex items-baseline gap-3 rounded-[14px] border bg-white/[0.02] px-3.5 py-3", TONE[event.tone]?.split(" ")[0])}
          >
            <span className="tabular w-12 shrink-0 font-mono text-[12.5px] text-lo">{clockLabel(event.clock)}</span>
            <span className="text-[15px] leading-snug text-hi">{event.text}</span>
          </motion.li>
        ))}
      </ol>

      {finished ? (
        <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-6 text-center">
          <p className="text-[clamp(1.9rem,8vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.04em] text-hi">{outcome.title}</p>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            <Stat label="Dispatch time at 06:50" value={outcome.finalCtd} unit="sec" />
            <Stat label="Covered in the rush" value={`${Math.round(outcome.peakCoverage * 100)}%`} />
          </div>
        </motion.div>
      ) : null}

      <ActionBar>
        {finished ? (
          <PrimaryButton onClick={() => act({ t: "next" })}>End the shift</PrimaryButton>
        ) : (
          <QuietButton onClick={() => setShown(events.length + 1)}>Skip to 06:50</QuietButton>
        )}
      </ActionBar>
    </>
  );
}
