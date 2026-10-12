"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { logAssessment, syncAssessment } from "@/lib/hiring/actions";
import { PHASES, PHASE_OF, RIYA_OPTIONS, paceOf } from "@/lib/hiring/content";
import { formFor } from "@/lib/hiring/forms";
import { CTD_TARGET, EXTEND_AT, clockLabel, metricsOf } from "@/lib/hiring/model";
import { nameOf } from "@/lib/hiring/roster";
import type { HiringState, SceneId } from "@/lib/hiring/types";
import { ASSESSMENT_SECONDS } from "@/lib/hiring/weights";
import { cn, formatDuration } from "@/lib/utils";
import { useHiringStore, type Attempt } from "@/stores/hiring-store";

import { HiringAssistant } from "./assistant";
import { CustomerBag, FinalCall, Outcome } from "./scenes/closing";
import { Absence, Floor } from "./scenes/floor";
import { Handover } from "./scenes/handover";
import { HighValueCase, NilPick } from "./scenes/inventory";
import { Arjun, Riya } from "./scenes/people";
import { Bottleneck, Triage } from "./scenes/peak";
import { PrimaryButton, Sheet, Speech } from "./ui";

/* ── What somebody says as one thing ends and the next begins ─────────── */

interface Beat {
  who: string;
  role?: string;
  lines: string[];
}

const RIYA_REPLY: Record<string, string> = {
  moveAB: "Okay. Zones A and B for her tonight.",
  pair: "I’ll put her alongside one of the experts.",
  coachLater: "I’ll book the Zone C time for after the peak.",
  keep: "Leaving her where she is, then.",
  removePicking: "Pulling her off picking now.",
  moveToPacking: "Sending her across to packing.",
  warn: "I’ll tell her it’s a formal warning.",
};

const ARJUN_REPLY: Record<string, string[]> = {
  willing: ["Okay.", "I’ll stay till eight."],
  reluctant: ["Fine. I’ll stay."],
  resentful: ["Understood."],
  leaving: ["Then I’m off at six."],
};

/**
 * Not feedback. Nobody here says whether a decision was a good one — they say
 * what a person in the store would say next, which is sometimes the same
 * thing and is never labelled as it.
 */
function beatFor(from: SceneId, state: HiringState): Beat | null {
  const form = formFor(state.form);
  if (from === "riya" && state.riya.choices) {
    const known = new Set(RIYA_OPTIONS.map((option) => option.id));
    return { who: "Floor Lead", lines: state.riya.choices.filter((choice) => known.has(choice)).map((choice) => RIYA_REPLY[choice]!) };
  }
  if (from === "arjun" && state.arjun.outcome !== "pending") {
    return { who: "Arjun", lines: ARJUN_REPLY[state.arjun.outcome] ?? [] };
  }
  if (from === "nilpick" && state.nil.outcome) {
    const { item, order } = form.nilPick;
    const line = {
      replenished: `Order ${order} went out complete.`,
      authorised: `Order ${order} went out without the ${item}.`,
      delisted: `${item} is off sale in the app. Order ${order} went out short.`,
      ignored: `Order ${order} is still waiting on the ${item}.`,
    }[state.nil.outcome];
    return { who: "Floor Lead", lines: [line] };
  }
  if (from === "customer" && state.bag) {
    const { by, ctdAfter } = state.bag;
    return {
      who: by === "unchanged" || by === "me" ? "Bench P2" : nameOf(by),
      role: by === "unchanged" || by === "me" ? undefined : "Bench P2",
      lines: [by === "unchanged" ? `Sent as it was. Dispatched at ${ctdAfter} sec.` : `Repacked. Dispatched at ${ctdAfter} sec.`],
    };
  }
  return null;
}

/* ── The clock that is not the store's ────────────────────────────────── */

function useRemaining(attempt: Attempt): number {
  const read = React.useCallback(
    () => Math.max(0, ASSESSMENT_SECONDS - Math.floor((Date.now() + attempt.skew - attempt.startedAt) / 1000)),
    [attempt],
  );
  const [remaining, setRemaining] = React.useState(read);
  React.useEffect(() => {
    const tick = () => setRemaining(read());
    tick();
    const timer = window.setInterval(tick, 1000);
    // A phone that slept reads the right time the moment it wakes.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [read]);
  return remaining;
}

/** Saves progress and telemetry as the shift goes, and keeps trying when it cannot. */
function useSync(attempt: Attempt): void {
  const pending = useHiringStore((store) => store.actions.length - store.saved);
  const queued = useHiringStore((store) => store.queue.length);
  const [retry, setRetry] = React.useState(0);
  const busy = React.useRef(false);

  React.useEffect(() => {
    if (attempt.local || (pending <= 0 && queued === 0)) return;
    const timer = window.setTimeout(async () => {
      if (busy.current) return;
      busy.current = true;
      let failed = false;
      try {
        const held = useHiringStore.getState();
        if (held.actions.length > held.saved) {
          if (await syncAssessment(attempt.id, held.actions)) held.markSaved(held.actions.length);
          else failed = true;
        }
        const batch = useHiringStore.getState().queue.slice(0, 100);
        if (batch.length) {
          if (await logAssessment(attempt.id, batch)) useHiringStore.getState().drain(batch.length);
          else failed = true;
        }
      } catch {
        failed = true;
      } finally {
        busy.current = false;
      }
      // Nothing changed in the store, so nothing would run this again.
      if (failed) window.setTimeout(() => setRetry((count) => count + 1), 8000);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [attempt, pending, queued, retry]);

  React.useEffect(() => {
    const note = useHiringStore.getState().note;
    const visibility = () => note(document.hidden ? "hidden" : "visible");
    const online = () => {
      note("online");
      setRetry((count) => count + 1);
    };
    const offline = () => note("offline");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
}

/* ── The shift ────────────────────────────────────────────────────────── */

/**
 * One store, from 17:25 to the plan being locked.
 *
 * The header never leaves: store time, the thirty minutes, where in the shift
 * this is, and the three numbers the store is run on. Below it there is one
 * thing to deal with at a time.
 */
export function Simulation({ attempt, onFinished }: { attempt: Attempt; onFinished: () => void }) {
  const state = useHiringStore((store) => store.state);
  const act = useHiringStore((store) => store.dispatch);
  const remaining = useRemaining(attempt);
  useSync(attempt);

  const scene = state?.scene ?? "handover";
  const previous = React.useRef<SceneId>(scene);
  const [beat, setBeat] = React.useState<Beat | null>(null);

  React.useEffect(() => {
    if (!state || previous.current === scene) return;
    const next = beatFor(previous.current, state);
    previous.current = scene;
    setBeat(next && next.lines.length ? next : null);
    window.scrollTo({ top: 0 });
  }, [scene, state]);

  // Out of time: the shift closes on the decisions made so far.
  const expired = remaining <= 0;
  React.useEffect(() => {
    if (!expired || attempt.local) return;
    const held = useHiringStore.getState();
    if (held.state && held.state.scene !== "done") {
      held.note("expired");
      held.timeUp();
    }
  }, [expired, attempt.local]);

  const warned = React.useRef({ five: false, one: false });
  React.useEffect(() => {
    if (attempt.local) return;
    if (remaining <= 300 && remaining > 60 && !warned.current.five) {
      warned.current.five = true;
      useHiringStore.getState().note("warning_5");
    }
    if (remaining <= 60 && remaining > 0 && !warned.current.one) {
      warned.current.one = true;
      useHiringStore.getState().note("warning_1");
    }
  }, [remaining, attempt.local]);

  const done = scene === "done";
  React.useEffect(() => {
    if (done) onFinished();
  }, [done, onFinished]);

  if (!state || done) return null;

  const now = metricsOf(state);
  const phase = PHASE_OF[scene];
  const phaseIndex = PHASES.indexOf(phase);
  const props = { state, act };
  const playback = scene === "outcome";
  // Where the thirty minutes are against where the candidate is. A guide only.
  const pace = paceOf(ASSESSMENT_SECONDS - remaining, phaseIndex);
  const behindMinutes = Math.floor(pace.behind / 60);

  return (
    <div className="min-h-dvh bg-void text-hi">
      <header className="sticky top-0 z-40 border-b border-line bg-void/92 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 pt-2.5 pb-2">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] tracking-[0.16em] text-lo uppercase">Store 114</span>
              {playback ? null : (
                <span className="tabular font-mono text-[19px] leading-none font-semibold text-hi" aria-label={`Store time ${clockLabel(state.clock)}`}>
                  {clockLabel(state.clock)}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
            <HiringAssistant />
            <p
              className={cn(
                "tabular flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[14px] font-semibold",
                attempt.local
                  ? "border-line-strong text-lo"
                  : remaining <= 60
                    ? "animate-breathe border-alert-500/60 bg-alert-500/10 text-alert-500"
                    : remaining <= 300
                      ? "border-warn-500/50 bg-warn-500/10 text-warn-500"
                      : "border-line-strong text-mid",
              )}
              role="timer"
              aria-label={`Assessment time remaining ${formatDuration(remaining)}`}
            >
              <Timer className="size-3.5" aria-hidden />
              {attempt.local ? "Practice" : formatDuration(remaining)}
            </p>
            </div>
          </div>

          <div className="relative mt-2.5">
          {!attempt.local && !playback ? (
            <span
              aria-hidden
              title="Where the time is"
              className="absolute -top-[3px] z-10 h-[10px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(10,10,10,0.9)] transition-[left] duration-1000 ease-linear"
              style={{ left: `${pace.marker * 100}%` }}
            />
          ) : null}
          <ol className="flex gap-1" aria-label="Where you are in the shift">
            {PHASES.map((label, index) => (
              <li key={label} className="min-w-0 flex-1" aria-current={index === phaseIndex ? "step" : undefined}>
                <span className={cn("block h-1 rounded-full", index < phaseIndex ? "bg-white/40" : index === phaseIndex ? "bg-ember-500" : "bg-white/[0.09]")} />
                <span
                  className={cn(
                    "mt-1 hidden truncate font-mono text-[10.5px] tracking-[0.14em] uppercase sm:block",
                    index === phaseIndex ? "text-ember-500" : index < phaseIndex ? "text-mid" : "text-faint",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] tracking-[0.16em] text-ember-500 uppercase sm:hidden">{phase}</p>
            <dl className={cn("tabular flex flex-1 justify-end gap-3.5 text-[12.5px] sm:justify-start sm:gap-5", playback && "invisible")}>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-lo">Waiting</dt>
                <dd className="font-semibold text-hi">{now.ordersWaiting}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-lo">CTD</dt>
                <dd className={cn("font-semibold", now.ctd > EXTEND_AT ? "text-alert-500" : now.ctd > CTD_TARGET ? "text-warn-500" : "text-hi")}>{now.ctd}s</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-lo">Pack queue</dt>
                <dd className="font-semibold text-hi">{now.packingQueue}</dd>
              </div>
            </dl>
          </div>
        </div>

        {!attempt.local && !playback && remaining > 300 && behindMinutes >= 1 ? (
          <p role="status" className="flex items-center justify-center gap-2 border-t border-line px-4 py-1.5 text-center text-[12.5px] text-mid">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn-500" />
            <span>
              About {behindMinutes} min behind the suggested pace.
              <span className="hidden sm:inline"> The white mark on the bar is where the time is.</span>
            </span>
          </p>
        ) : null}

        {!attempt.local && remaining <= 300 ? (
          <p
            role="status"
            className={cn(
              "border-t px-4 py-1.5 text-center text-[12.5px] font-medium",
              remaining <= 60 ? "border-alert-500/30 bg-alert-500/10 text-alert-500" : "border-warn-500/25 bg-warn-500/[0.07] text-warn-500",
            )}
          >
            {remaining <= 60
              ? "One minute left. The shift will close on the decisions you have made."
              : "Five minutes left."}
          </p>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pt-5 pb-40">
        {scene === "handover" ? <Handover {...props} /> : null}
        {scene === "floor" ? <Floor {...props} /> : null}
        {scene === "absence" ? <Absence {...props} /> : null}
        {scene === "riya" ? <Riya {...props} /> : null}
        {scene === "arjun" ? <Arjun {...props} /> : null}
        {scene === "case" ? <HighValueCase {...props} /> : null}
        {scene === "nilpick" ? <NilPick {...props} /> : null}
        {scene === "triage" ? <Triage {...props} /> : null}
        {scene === "bottleneck" ? <Bottleneck {...props} /> : null}
        {scene === "customer" ? <CustomerBag {...props} /> : null}
        {scene === "final" ? <FinalCall {...props} /> : null}
        {scene === "outcome" ? <Outcome {...props} /> : null}
      </main>

      <Sheet open={beat !== null} onOpenChange={() => setBeat(null)} title={clockLabel(state.clock)} dismissable={false}>
        {beat ? <Speech who={beat.who} role={beat.role} lines={beat.lines} /> : null}
        <PrimaryButton className="mt-5 sm:w-full" onClick={() => setBeat(null)}>
          Continue
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
