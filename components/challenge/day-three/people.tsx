"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";

import { Avatar, MomentHeading, Shift, StaffMessage, TONE_TEXT, coverTone } from "@/components/challenge/day-three/ui";
import { Button } from "@/components/ui/button";
import {
  coverageOver,
  evaluate,
  riyaPpi,
  windowOf,
  workerById,
  type World,
} from "@/lib/challenge/day-three/capacity";
import { PEAK_TO, clockLabel } from "@/lib/challenge/day-three/forecast";
import {
  ACKNOWLEDGE,
  CLARIFY,
  REQUEST,
  arjunComplete,
  arjunReply,
  arjunSaid,
  riyaDevelopment,
  type ResponseOption,
} from "@/lib/challenge/day-three/people";
import { ARJUN, FAISAL, FLEX, PICKER_REVIEW, REGULARS, RIYA } from "@/lib/challenge/day-three/workforce";
import type {
  AcknowledgeId,
  ArjunLocation,
  ClarifyId,
  Day3State,
  RequestId,
  RiyaAction,
  Worker,
} from "@/lib/challenge/day-three/types";
import { cn } from "@/lib/utils";

/**
 * The people module.
 *
 * Two short managerial moments inside the shift, not a conversation simulator:
 * a drawer over the same board, a handful of structured decisions, and a
 * consequence the operator can watch land on the timeline behind it. Arjun's
 * is about saying something true; Riya's is about looking before deciding.
 */

const ARJUN_WORKER = REGULARS.find((worker) => worker.id === ARJUN.id)!;
const RIYA_WORKER = FLEX.find((worker) => worker.id === RIYA.id)!;
const FAISAL_WORKER = REGULARS.find((worker) => worker.id === FAISAL.id)!;

export type Picker = "faisal" | "riya";

/* ── The two alerts, on the board ─────────────────────────────────────── */

export function ArjunAlert({
  state,
  time,
  onOpen,
}: {
  state: Day3State;
  time: string;
  onOpen: () => void;
}) {
  const started = state.people.arjun.location !== null;
  return (
    <section aria-label="Arjun wants a word" className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="People alert"
        title="Arjun wants a word before peak."
        sub="Your fastest picker is rostered to 8. The 8–10 PM overtime on the board was pencilled in last week and never agreed with him."
      />
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-ember-500/35 bg-ember-500/[0.05] p-3.5">
        <Avatar worker={ARJUN_WORKER} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-hi">{ARJUN_WORKER.name}</p>
          <p className="text-[11.5px] text-lo">
            {ARJUN_WORKER.level} · {ARJUN_WORKER.tenure} · rota {clockLabel(0)}–{clockLabel(ARJUN.rotaEnd)}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onOpen}>
          {started ? "Back to Arjun" : "Speak to Arjun"}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}

/**
 * Both slow pickers, raised together.
 *
 * The same complaint twice is the point: Faisal is a three-year picker whose
 * pace has been climbing all week, Riya is eleven days in and nine seconds
 * faster than she started. One number, two entirely different problems — and
 * the operator has to tell them apart before the peak.
 */
export function PickerReviewAlert({
  state,
  time,
  onReview,
}: {
  state: Day3State;
  time: string;
  onReview: (who: Picker) => void;
}) {
  const faisalDone = Boolean(state.milestones.faisal);
  const riyaDone = state.people.riya.applied;
  return (
    <section aria-label="Picker performance review" className="space-y-3">
      <MomentHeading
        time={time}
        eyebrow="Floor lead"
        title="“They're both too slow.”"
        sub="Two pickers, the same complaint, an hour before the peak. Neither number tells you why on its own."
      />
      <StaffMessage from="Floor lead" role="Shift supervisor" time={time} lines={PICKER_REVIEW.lead} tone="ember" />
      <ul className="grid gap-2 sm:grid-cols-2">
        <li>
          <PickerCard
            worker={FAISAL_WORKER}
            ppi={FAISAL.today}
            detail={`${FAISAL_WORKER.level} · ${FAISAL_WORKER.tenure}`}
            done={faisalDone}
            summary={state.faisal.join(" + ")}
            onOpen={() => onReview("faisal")}
          />
        </li>
        <li>
          <PickerCard
            worker={RIYA_WORKER}
            ppi={RIYA.today}
            detail={`On-demand picker · ${RIYA.tenure}`}
            done={riyaDone}
            summary={state.people.riya.interventions.join(" + ")}
            onOpen={() => onReview("riya")}
          />
        </li>
      </ul>
    </section>
  );
}

function PickerCard({
  worker,
  ppi,
  detail,
  done,
  summary,
  onOpen,
}: {
  worker: Worker;
  ppi: number;
  detail: string;
  done: boolean;
  summary: string;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-card border p-3.5",
        done ? "border-ion-500/40 bg-ion-500/[0.04]" : "border-ember-500/35 bg-ember-500/[0.05]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar worker={worker} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-tight font-semibold text-hi">{worker.name}</p>
          <p className="mt-0.5 text-[11.5px] text-lo">{detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p data-readout className="text-[17px] leading-none font-semibold text-alert-500 tabular-nums">
            {ppi}s
          </p>
          <p className="mt-0.5 font-mono text-[9.5px] text-faint">PPI today</p>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-ion-400">{worker.accuracy}% accurate</p>
      {done && summary ? <p className="mt-1 text-[11px] text-info-500">{summary}</p> : null}
      <Button
        variant={done ? "secondary" : "primary"}
        size="md"
        className="mt-3 w-full"
        onClick={onOpen}
      >
        {done ? `Reopen ${worker.name}` : `Review ${worker.name}`}
        {done ? null : <ArrowRight />}
      </Button>
    </div>
  );
}

/** Flip between the two reviews without leaving the drawer. */
export function PickerSwitch({
  who,
  faisalDone,
  riyaDone,
  onSwitch,
}: {
  who: Picker;
  faisalDone: boolean;
  riyaDone: boolean;
  onSwitch: (who: Picker) => void;
}) {
  const tabs: { id: Picker; label: string; done: boolean }[] = [
    { id: "faisal", label: FAISAL_WORKER.name, done: faisalDone },
    { id: "riya", label: RIYA_WORKER.name, done: riyaDone },
  ];
  return (
    <div className="mb-3 grid grid-cols-2 gap-1" role="group" aria-label="Which picker">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={who === tab.id}
          onClick={() => onSwitch(tab.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-[12.5px] font-medium transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
            who === tab.id
              ? "border-ember-500/70 bg-ember-500/15 text-hi"
              : "border-line bg-surface text-lo hover:text-mid",
          )}
        >
          {tab.label}
          {tab.done ? <Check className="size-3 text-ion-400" aria-label="reviewed" /> : null}
        </button>
      ))}
    </div>
  );
}

/* ── The drawer ───────────────────────────────────────────────────────── */

/**
 * A side panel on a desktop, a full-height sheet on a phone. The board stays
 * where it was underneath: nothing about these two moments is a separate page.
 */
export function PeopleDrawer({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
          <motion.button
            type="button"
            aria-label="Close"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-void/75 backdrop-blur-sm sm:bg-void/55"
          />
          <motion.div
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? undefined : { y: "100%" }}
            transition={{ duration: 0.3, ease: easingOut }}
            className={cn(
              "absolute inset-x-0 top-6 bottom-0 overflow-y-auto rounded-t-panel border-t border-line bg-obsidian",
              "sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[460px] sm:rounded-none sm:border-t-0 sm:border-l",
            )}
          >
            <div className="sticky top-0 z-10 flex justify-end bg-obsidian/92 px-4 pt-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-lo hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="px-4 pt-1 pb-8 sm:px-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

const easingOut = [0.16, 1, 0.3, 1] as const;

/* ── Arjun ────────────────────────────────────────────────────────────── */

export function ArjunIssuePanel({
  state,
  world,
  time,
  onLocation,
  onCheckIncentive,
  onCheckPerformance,
  onRespond,
  onSelect,
  onAnswer,
  onFinish,
}: {
  state: Day3State;
  world: World;
  time: string;
  onLocation: (location: ArjunLocation) => void;
  onCheckIncentive: () => void;
  onCheckPerformance: () => void;
  onRespond: () => void;
  onSelect: (slot: "acknowledge" | "clarify" | "request", id: string) => void;
  onAnswer: () => void;
  onFinish: () => void;
}) {
  const arjun = state.people.arjun;
  const withOt = React.useMemo(
    () => coverageOver(evaluate(asOutcome(state, "extended"), world), ARJUN.rotaEnd, ARJUN.otEnd).picking,
    [state, world],
  );
  const withoutOt = React.useMemo(
    () => coverageOver(evaluate(asOutcome(state, "held"), world), ARJUN.rotaEnd, ARJUN.otEnd).picking,
    [state, world],
  );

  return (
    <section aria-label="Arjun's overtime" className="space-y-3.5">
      <header className="flex items-start gap-3">
        <Avatar worker={ARJUN_WORKER} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[18px] leading-tight font-semibold text-hi">{ARJUN_WORKER.name}</p>
          <p className="mt-0.5 text-[12.5px] text-mid">
            {ARJUN_WORKER.level} · {ARJUN_WORKER.tenure}
          </p>
          <p className="mt-1 font-mono text-[10.5px] text-faint">
            Rota {clockLabel(0)}–{clockLabel(ARJUN.rotaEnd)} · {clockLabel(ARJUN.rotaEnd)}–{clockLabel(ARJUN.otEnd)} pencilled in
          </p>
        </div>
      </header>

      <StaffMessage from="Arjun" role="Expert picker" time={time} lines={ARJUN.lines} tone="alert" />

      {/* Step 1 · where */}
      {arjun.location === null ? (
        <Step number={1} title="Two associates are within earshot.">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ChoiceButton label="Speak here" detail="Answer him where he is" onClick={() => onLocation("here")} />
            <ChoiceButton label="Move aside" detail="Two steps, out of earshot" onClick={() => onLocation("aside")} primary />
          </div>
        </Step>
      ) : (
        <Note
          tone={arjun.location === "aside" ? "ion" : "warn"}
          text={
            arjun.location === "aside"
              ? "Conversation moved private · team disruption ↓"
              : "Answered on the floor · nearby team attention ↑"
          }
        />
      )}

      {/* Step 2 · check or react */}
      {arjun.location !== null && !arjun.responding ? (
        <Step number={2} title="Before you answer.">
          <div className="grid gap-1.5">
            <ToolButton
              label="Check incentive status"
              detail="Last Sunday's target payout"
              done={arjun.incentiveChecked}
              onClick={onCheckIncentive}
            />
            <ToolButton
              label="Check performance"
              detail="His record, and what 8–10 PM costs without him"
              done={arjun.performanceChecked}
              onClick={onCheckPerformance}
            />
          </div>
          {arjun.incentiveChecked ? <IncentiveStatusCard /> : null}
          {arjun.performanceChecked ? (
            <PerformanceCard withOt={withOt} withoutOt={withoutOt} />
          ) : null}
          <Button variant={arjun.incentiveChecked ? "primary" : "secondary"} size="md" className="w-full" onClick={onRespond}>
            Respond now
            <ArrowRight />
          </Button>
        </Step>
      ) : null}

      {/* Step 3 · the response */}
      {arjun.responding && !arjun.outcome ? (
        <Step number={3} title="What you say.">
          <Slot
            label="Acknowledge"
            options={ACKNOWLEDGE}
            value={arjun.response.acknowledge}
            onSelect={(id) => onSelect("acknowledge", id)}
          />
          <Slot
            label="Clarify"
            options={CLARIFY}
            value={arjun.response.clarify}
            onSelect={(id) => onSelect("clarify", id)}
          />
          <Slot
            label="Request"
            options={REQUEST}
            value={arjun.response.request}
            onSelect={(id) => onSelect("request", id)}
          />
          {arjunSaid(arjun).length > 0 ? (
            <blockquote className="rounded-card border border-line bg-surface p-3 text-[13px] leading-relaxed text-hi">
              {arjunSaid(arjun).join(" ")}
            </blockquote>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!arjunComplete(arjun)}
            onClick={onAnswer}
          >
            Say it
            <ArrowRight />
          </Button>
        </Step>
      ) : null}

      {arjun.outcome ? (
        <div className="space-y-3">
          <StaffMessage
            from="Arjun"
            role="Expert picker"
            time={time}
            lines={arjunReply(arjun)}
            tone={arjun.outcome === "extended" ? "ember" : "alert"}
          />
          <div className="rounded-card border border-line bg-surface p-3.5">
            <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">What it changes</p>
            <dl className="mt-2 space-y-2">
              <Line
                label="Arjun tonight"
                value={
                  arjun.outcome === "extended"
                    ? `On picking until ${clockLabel(ARJUN.otEnd)}`
                    : `Clocks out at ${clockLabel(ARJUN.rotaEnd)}`
                }
                tone={arjun.outcome === "extended" ? "ion" : "warn"}
              />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[12px] text-lo">Picking, 8–10 PM</dt>
                <dd>
                  <Shift from={withOt} to={arjun.outcome === "extended" ? withOt : withoutOt} className="text-[14px]" />
                </dd>
              </div>
            </dl>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={onFinish}>
            Back to the floor
            <ArrowRight />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function asOutcome(state: Day3State, outcome: "extended" | "held"): Day3State {
  return { ...state, people: { ...state.people, arjun: { ...state.people.arjun, outcome } } };
}

export function IncentiveStatusCard() {
  const rows: { label: string; value: string; ok: boolean | null }[] = [
    { label: "Target", value: ARJUN.status.target, ok: true },
    { label: "Submission", value: ARJUN.status.submission, ok: true },
    { label: "Approval", value: ARJUN.status.approval, ok: true },
    { label: "Payment", value: ARJUN.status.payment, ok: false },
    { label: "Expected", value: ARJUN.status.expected, ok: null },
  ];
  return (
    <div className="rounded-card border border-ion-500/35 bg-ion-500/[0.05] p-3.5">
      <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ion-400 uppercase">
        <ShieldCheck className="size-3.5" aria-hidden />
        ₹{ARJUN.incentive} incentive · {ARJUN.status.period}
      </p>
      <dl className="mt-2.5 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{row.label}</dt>
            <dd
              className={cn(
                "text-right text-[12.5px]",
                row.ok === true ? "text-ion-400" : row.ok === false ? "text-warn-500" : "text-hi",
              )}
            >
              {row.value}
              {row.ok === true ? " ✓" : ""}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-mid">
        The money exists and is approved. Nobody has told him.
      </p>
    </div>
  );
}

function PerformanceCard({ withOt, withoutOt }: { withOt: number; withoutOt: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Arjun&rsquo;s record</p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="PPI" value={`${ARJUN_WORKER.ppi?.toFixed(1)}s`} tone="ion" />
        <Stat label="Accuracy" value={`${ARJUN_WORKER.accuracy}%`} tone="ion" />
        <Stat label="Attendance" value={`${ARJUN_WORKER.attendance}%`} tone="ion" />
      </dl>
      <p className="mt-2 text-[11.5px] leading-relaxed text-mid">
        {ARJUN.performance.targetsHit} · {ARJUN.performance.lateDays}.
      </p>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
        <span className="text-[12px] text-lo">Picking, 8–10 PM, without him</span>
        <Shift from={withOt} to={withoutOt} className="text-[14px]" />
      </div>
    </div>
  );
}

function Slot<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: ResponseOption<T>[];
  value: T | null;
  onSelect: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">{label}</p>
      <div className="mt-1.5 grid gap-1">
        {options.map((option) => {
          const on = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(option.id)}
              className={cn(
                "rounded-card border px-3 py-2 text-left text-[12.5px] leading-snug transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                on
                  ? "border-ember-500/70 bg-ember-500/[0.09] text-hi"
                  : "border-line bg-elevated text-mid hover:border-line-bright hover:text-hi",
              )}
            >
              “{option.text}”
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Riya ─────────────────────────────────────────────────────────────── */

const RIYA_ACTIONS: { id: RiyaAction; label: string; detail: string; risk?: boolean }[] = [
  { id: "zone", label: "Move to high-velocity Zone A/B for peak", detail: "Her fastest zones · from 6 PM" },
  { id: "pair", label: "Pair with an expert for 30 min", detail: "6:00–6:30, beside a pro picker" },
  { id: "coach", label: "Schedule Zone C coaching after peak", detail: "Tomorrow, with the floor lead" },
  { id: "keep", label: "Keep current assignment", detail: "No change tonight" },
  { id: "warn", label: "Issue performance warning", detail: "Formal note on an 11-day record", risk: true },
  { id: "packing", label: "Move to packing", detail: "Not trained on packing", risk: true },
  { id: "remove", label: "Remove from picking", detail: "Off the floor for the evening", risk: true },
];

export function RiyaReviewPanel({
  state,
  world,
  time,
  onViewTrend,
  onViewZones,
  onOpenZone,
  onToggle,
  onApply,
}: {
  state: Day3State;
  world: World;
  time: string;
  onViewTrend: () => void;
  onViewZones: () => void;
  onOpenZone: (zoneId: string) => void;
  onToggle: (action: RiyaAction) => void;
  onApply: () => void;
}) {
  const riya = state.people.riya;
  const window = windowOf(state, world, RIYA_WORKER);
  const until = Math.min(window?.end ?? RIYA.prepaidUntil, PEAK_TO);
  const base: Day3State = {
    ...state,
    people: { ...state.people, riya: { ...riya, interventions: [] } },
  };
  const pickBase = coverageOver(evaluate(base, world), RIYA.applyAt, until).picking;
  const pickNow = coverageOver(evaluate(state, world), RIYA.applyAt, until).picking;
  const off = riya.interventions.includes("remove") || riya.interventions.includes("packing");
  const ppiNow = riyaPpi(state, world, Math.max(RIYA.pairTo, RIYA.applyAt));
  const full = riya.interventions.length >= 2;

  return (
    <section aria-label="Riya's performance" className="space-y-3.5">
      <header className="flex items-start gap-3">
        <Avatar worker={RIYA_WORKER} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[18px] leading-tight font-semibold text-hi">{RIYA_WORKER.name}</p>
          <p className="mt-0.5 text-[12.5px] text-mid">On-demand picker · {RIYA.tenure}</p>
          <p className="mt-1 font-mono text-[10.5px] text-faint">
            On picking since {clockLabel(0)} · booked to {clockLabel(window?.end ?? RIYA.prepaidUntil)}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Today's PPI" value={`${RIYA.today}s`} tone="alert" />
        <Stat label="Benchmark" value="10–15s" tone="hi" />
        <Stat label="Accuracy" value={`${RIYA.accuracy}%`} tone="ion" />
        <Stat label="Scan compliance" value={`${RIYA.scanCompliance}%`} tone="ion" />
        <Stat label="Attendance" value={`${RIYA.attendance}%`} tone="ion" />
        <Stat label="Tenure" value={RIYA.tenure} tone="hi" />
      </dl>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <ToolButton label="PPI trend" detail="Her last five shifts" done={riya.trendViewed} onClick={onViewTrend} />
        <ToolButton label="PPI by zone" detail="Where the time goes" done={riya.zonesViewed} onClick={onViewZones} />
      </div>

      {riya.trendViewed ? <PpiTrendChart /> : null}
      {riya.zonesViewed ? (
        <ZonePerformanceView open={riya.zoneOpen} found={riya.zoneCFound} onOpen={onOpenZone} time={time} />
      ) : null}

      <div>
        <p className="flex items-baseline gap-2 font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
          Your call
          <span className="ml-auto text-faint">{riya.interventions.length} of 2</span>
        </p>
        <div className="mt-1.5 grid gap-1" role="group" aria-label="Interventions for Riya">
          {RIYA_ACTIONS.map((action) => {
            const on = riya.interventions.includes(action.id);
            return (
              <button
                key={action.id}
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => onToggle(action.id)}
                className={cn(
                  "flex items-start gap-2.5 rounded-card border p-2.5 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  on ? "border-ember-500/70 bg-ember-500/[0.08]" : "border-line bg-elevated hover:border-line-bright",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                    on ? "border-ember-500 bg-ember-500 text-void" : "border-line-strong",
                  )}
                  aria-hidden
                >
                  {on ? <Check className="size-3" /> : null}
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold text-hi">{action.label}</span>
                  <span className={cn("mt-0.5 block text-[11px]", action.risk ? "text-warn-500" : "text-lo")}>
                    {action.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-3.5">
        <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">Projected</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11.5px] text-lo">Riya&rsquo;s pace</p>
            <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums">
              <span className="text-alert-500">{RIYA.today}s</span>
              <span className="text-faint"> → </span>
              {off ? (
                <span className="text-faint">off picking</span>
              ) : (
                <span className={ppiNow > 20 ? "text-alert-500" : ppiNow > 17 ? "text-warn-500" : "text-ion-400"}>
                  {ppiNow.toFixed(1)}s
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11.5px] text-lo">Picking · 6:00–{clockLabel(until).replace(" PM", "")} PM</p>
            <Shift from={pickBase} to={pickNow} className="mt-1 text-[16px]" />
          </div>
        </div>
        <p className="mt-2.5 flex items-baseline gap-2 border-t border-line pt-2.5 text-[12px]">
          <span className="text-lo">Development likelihood</span>
          <span
            className={cn(
              "ml-auto font-mono font-semibold",
              riyaDevelopment(riya) === "High"
                ? "text-ion-400"
                : riyaDevelopment(riya) === "Medium"
                  ? "text-warn-500"
                  : "text-alert-500",
            )}
          >
            {riyaDevelopment(riya)}
          </span>
        </p>
        {riya.interventions.length === 0 ? (
          <p className={cn("mt-2 text-[12px]", TONE_TEXT[coverTone(pickNow)])}>
            Choose up to two. Accuracy is not the problem here.
          </p>
        ) : null}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={riya.interventions.length === 0}
        onClick={onApply}
      >
        Apply to Riya
        <ArrowRight />
      </Button>
    </section>
  );
}

/** Five shifts of PPI against the store's working range. */
export function PpiTrendChart() {
  const values = RIYA.trend;
  const W = 280;
  const H = 70;
  const min = 12;
  const max = 33;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const x = (i: number) => (i / (values.length - 1)) * (W - 16) + 8;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <figure className="rounded-card border border-line bg-surface p-3.5">
      <figcaption className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">
        PPI · last five shifts
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-[70px] w-full"
        role="img"
        aria-label={`PPI over five shifts: ${values.join(", ")} seconds`}
      >
        <rect x={0} y={y(15)} width={W} height={y(10) - y(15)} className="fill-ion-500/10" />
        <line x1={0} x2={W} y1={y(15)} y2={y(15)} className="stroke-ion-500/40" strokeDasharray="3 3" />
        <polyline points={points} fill="none" className="stroke-ion-400" strokeWidth={1.6} />
        {values.map((v, i) => (
          <circle
            key={v}
            cx={x(i)}
            cy={y(v)}
            r={i === values.length - 1 ? 3.2 : 2}
            className={i === values.length - 1 ? "fill-ion-400" : "fill-ion-500/60"}
          />
        ))}
      </svg>
      <p className="flex justify-between font-mono text-[9.5px] text-faint tabular-nums">
        {values.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </p>
      <p className="mt-1 text-[11px] text-faint">
        Shaded band is the store&rsquo;s 10–15 sec working range. She is outside it, and nine seconds closer than
        eleven days ago.
      </p>
    </figure>
  );
}

export function ZonePerformanceView({
  open,
  found,
  time,
  onOpen,
}: {
  open: string | null;
  found: boolean;
  time: string;
  onOpen: (zoneId: string) => void;
}) {
  const max = Math.max(...RIYA.zones.map((zone) => zone.ppi));
  const zone = RIYA.zones.find((entry) => entry.id === open) ?? null;
  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">PPI by zone · tonight</p>
      <ul className="mt-2 space-y-1.5">
        {RIYA.zones.map((entry) => {
          const active = open === entry.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onOpen(entry.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  active ? "border-ember-500/60 bg-ember-500/[0.07]" : "border-transparent hover:border-line",
                )}
              >
                <span className="w-4 shrink-0 font-mono text-[11px] font-semibold text-mid">{entry.id}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    className={cn("block h-full rounded-full", entry.ppi > 25 ? "bg-alert-500" : "bg-ion-500/70")}
                    style={{ width: `${(entry.ppi / max) * 100}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-12 shrink-0 text-right font-mono text-[12px] tabular-nums",
                    entry.ppi > 25 ? "text-alert-500" : "text-hi",
                  )}
                >
                  {entry.ppi}s
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {zone ? (
        <div className="mt-2.5 border-t border-line pt-2.5">
          <p className="text-[12px] text-hi">
            <span className="font-semibold">Zone {zone.id}</span> · {zone.label}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-mid">{zone.note}</p>
        </div>
      ) : (
        <p className="mt-2 text-[11.5px] text-faint">Open a zone to see what is in it.</p>
      )}
      {found ? (
        <div className="mt-2.5">
          <StaffMessage from="Riya" role="On-demand picker" time={time} lines={RIYA.quote} tone="neutral" />
        </div>
      ) : null}
    </div>
  );
}

/* ── The scorecard insight ────────────────────────────────────────────── */

export function PeopleManagementInsight({
  balance,
}: {
  balance: { trust: number; standards: number; label: string; name: string; body: string };
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="font-mono text-[10px] tracking-[0.14em] text-lo uppercase">People management balance</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Meter label="Trust" value={balance.trust} />
        <Meter label="Standards" value={balance.standards} />
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-ember-400 uppercase">{balance.label}</p>
      <p className="mt-1 text-[14px] font-semibold text-hi">{balance.name}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{balance.body}</p>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">{label}</span>
        <span data-readout className={cn("font-mono text-[15px] font-semibold tabular-nums", value >= 65 ? "text-ion-400" : "text-warn-500")}>
          {value}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <span
          className={cn("block h-full rounded-full", value >= 65 ? "bg-ion-500" : "bg-warn-500")}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ── Small parts ──────────────────────────────────────────────────────── */

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-[12.5px] font-medium text-hi">
        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-ember-500/40 font-mono text-[10px] text-ember-400">
          {number}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}

function ChoiceButton({
  label,
  detail,
  primary,
  onClick,
}: {
  label: string;
  detail: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-card border p-3 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        primary ? "border-ember-500/50 bg-ember-500/[0.06] hover:bg-ember-500/[0.1]" : "border-line bg-elevated hover:border-line-bright",
      )}
    >
      <span className="block text-[13px] font-semibold text-hi">{label}</span>
      <span className="mt-0.5 block text-[11.5px] text-lo">{detail}</span>
    </button>
  );
}

function ToolButton({
  label,
  detail,
  done,
  onClick,
}: {
  label: string;
  detail: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      className={cn(
        "flex items-center gap-2.5 rounded-card border p-2.5 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
        done ? "border-ion-500/45 bg-ion-500/[0.05]" : "border-line bg-elevated hover:border-line-bright",
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          done ? "border-ion-500 bg-ion-500 text-void" : "border-line-strong",
        )}
        aria-hidden
      >
        {done ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-hi">{label}</span>
        <span className="block text-[11px] text-lo">{detail}</span>
      </span>
    </button>
  );
}

function Note({ tone, text }: { tone: "ion" | "warn"; text: string }) {
  return (
    <p
      className={cn(
        "rounded-card border px-3 py-2 text-[11.5px]",
        tone === "ion" ? "border-ion-500/35 bg-ion-500/[0.05] text-ion-400" : "border-warn-500/35 bg-warn-500/[0.05] text-warn-500",
      )}
    >
      {text}
    </p>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone: "ion" | "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-lo">{label}</dt>
      <dd className={cn("text-[13px] font-semibold", tone === "ion" ? "text-ion-400" : "text-warn-500")}>{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ion" | "warn" | "alert" | "hi" }) {
  return (
    <div className="rounded-card border border-line bg-surface px-2.5 py-2">
      <dt className="font-mono text-[9px] tracking-[0.1em] text-faint uppercase">{label}</dt>
      <dd
        data-readout
        className={cn(
          "mt-1 text-[14px] font-semibold tabular-nums",
          tone === "ion" ? "text-ion-400" : tone === "alert" ? "text-alert-500" : tone === "warn" ? "text-warn-500" : "text-hi",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** The card that flags Arjun in the people pool while his moment is live. */
export function PeoplePulse() {
  return (
    <span className="relative flex size-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500/70" />
      <span className="relative inline-flex size-2 rounded-full bg-ember-500" />
    </span>
  );
}
