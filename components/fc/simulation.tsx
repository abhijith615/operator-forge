"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { logFc, syncFc } from "@/lib/fc/actions";
import { FC_SITE, PHASES, clockLabel, type Phase } from "@/lib/fc/content";
import type { SceneId } from "@/lib/fc/types";
import { cn, formatDuration } from "@/lib/utils";
import { useFcStore, type FcAttempt } from "@/stores/fc-store";

import { FcAssistant } from "./assistant";
import { DataScene, Outcome, Peak } from "./scenes/closing";
import { Handover, Plan, Replan } from "./scenes/planning";
import { Discrepancy, Receive } from "./scenes/receiving";

const PHASE_OF: Record<SceneId, Phase> = {
  handover: "Handover",
  plan: "Dock plan",
  replan: "Dock plan",
  receive: "Receive",
  discrepancy: "Discrepancy",
  data: "Data",
  peak: "Peak",
  outcome: "Peak",
  done: "Peak",
};

/** The suggested split of the thirty minutes, from the brief. */
const PHASE_SECONDS: Record<Phase, number> = { Handover: 180, "Dock plan": 360, Receive: 360, Discrepancy: 300, Data: 300, Peak: 300 };

function paceOf(elapsed: number, phaseIndex: number, limit: number): { marker: number; behind: number } {
  const stretch = limit / 1800;
  let start = 0;
  let marker = 1;
  let due = 0;
  PHASES.forEach((phase, index) => {
    const length = PHASE_SECONDS[phase] * stretch;
    if (elapsed >= start && elapsed < start + length) marker = (index + (elapsed - start) / length) / PHASES.length;
    start += length;
    if (index === phaseIndex) due = start;
  });
  return { marker: Math.max(0, Math.min(1, marker)), behind: Math.max(0, Math.round(elapsed - due)) };
}

function useRemaining(attempt: FcAttempt): number {
  const read = React.useCallback(() => Math.max(0, attempt.limit - Math.floor((Date.now() + attempt.skew - attempt.startedAt) / 1000)), [attempt]);
  const [remaining, setRemaining] = React.useState(read);
  React.useEffect(() => {
    const tick = () => setRemaining(read());
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [read]);
  return remaining;
}

/** Saves progress and telemetry as the shift goes, and keeps retrying. */
function useSync(attempt: FcAttempt): void {
  const pending = useFcStore((store) => store.actions.length - store.saved);
  const queued = useFcStore((store) => store.queue.length);
  const [retry, setRetry] = React.useState(0);
  const busy = React.useRef(false);

  React.useEffect(() => {
    if (attempt.local || (pending <= 0 && queued === 0)) return;
    const timer = window.setTimeout(async () => {
      if (busy.current) return;
      busy.current = true;
      let failed = false;
      try {
        const held = useFcStore.getState();
        if (held.actions.length > held.saved) {
          if (await syncFc(attempt.id, held.actions)) held.markSaved(held.actions.length);
          else failed = true;
        }
        const batch = useFcStore.getState().queue.slice(0, 100);
        if (batch.length) {
          if (await logFc(attempt.id, batch)) useFcStore.getState().drain(batch.length);
          else failed = true;
        }
      } catch {
        failed = true;
      } finally {
        busy.current = false;
      }
      if (failed) window.setTimeout(() => setRetry((count) => count + 1), 8000);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [attempt, pending, queued, retry]);

  React.useEffect(() => {
    const note = useFcStore.getState().note;
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

/**
 * The inbound shift, 07:00 to 12:00. The header stays: FC, shift clock, the
 * thirty minutes, where in the shift this is, and "Ask". Below it, one thing
 * at a time.
 */
export function FcSimulation({ attempt, onFinished }: { attempt: FcAttempt; onFinished: () => void }) {
  const state = useFcStore((store) => store.state);
  const act = useFcStore((store) => store.dispatch);
  const remaining = useRemaining(attempt);
  useSync(attempt);

  const scene = state?.scene ?? "handover";
  const previous = React.useRef<SceneId>(scene);
  React.useEffect(() => {
    if (previous.current !== scene) {
      previous.current = scene;
      window.scrollTo({ top: 0 });
    }
  }, [scene]);

  const expired = remaining <= 0;
  React.useEffect(() => {
    if (!expired) return;
    const held = useFcStore.getState();
    if (held.state && held.state.scene !== "done") {
      held.note("expired");
      held.timeUp();
    }
  }, [expired]);

  const warned = React.useRef({ five: false, one: false });
  React.useEffect(() => {
    if (remaining <= 300 && remaining > 60 && !warned.current.five) {
      warned.current.five = true;
      useFcStore.getState().note("warning_5");
    }
    if (remaining <= 60 && remaining > 0 && !warned.current.one) {
      warned.current.one = true;
      useFcStore.getState().note("warning_1");
    }
  }, [remaining]);

  const done = scene === "done";
  React.useEffect(() => {
    if (done) onFinished();
  }, [done, onFinished]);

  if (!state || done) return null;

  const phase = PHASE_OF[scene];
  const phaseIndex = PHASES.indexOf(phase);
  const pace = paceOf(attempt.limit - remaining, phaseIndex, attempt.limit);
  const behindMinutes = Math.floor(pace.behind / 60);
  const props = { state, act };

  return (
    <div className="min-h-dvh bg-void text-hi">
      <header className="sticky top-0 z-40 border-b border-line bg-void/92 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 pt-2.5 pb-2">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] tracking-[0.16em] text-lo uppercase">{FC_SITE}</span>
              <span className="tabular font-mono text-[19px] leading-none font-semibold text-hi" aria-label={`Shift time ${clockLabel(state.clock)}`}>
                {clockLabel(state.clock)}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <FcAssistant />
              <p
                className={cn(
                  "tabular flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[14px] font-semibold",
                  remaining <= 60
                    ? "animate-breathe border-alert-500/60 bg-alert-500/10 text-alert-500"
                    : remaining <= 300
                      ? "border-warn-500/50 bg-warn-500/10 text-warn-500"
                      : "border-line-strong text-mid",
                )}
                role="timer"
                aria-label={`Test time remaining ${formatDuration(remaining)}`}
              >
                <Timer className="size-3.5" aria-hidden />
                {formatDuration(remaining)}
              </p>
            </div>
          </div>

          <div className="relative mt-2.5">
            <span
              aria-hidden
              title="Where the time is"
              className="absolute -top-[3px] z-10 h-[10px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(10,10,10,0.9)] transition-[left] duration-1000 ease-linear"
              style={{ left: `${pace.marker * 100}%` }}
            />
            <ol className="flex gap-1" aria-label="Where you are in the shift">
              {PHASES.map((label, index) => (
                <li key={label} className="min-w-0 flex-1" aria-current={index === phaseIndex ? "step" : undefined}>
                  <span className={cn("block h-1 rounded-full transition-colors duration-500", index < phaseIndex ? "bg-white/40" : index === phaseIndex ? "bg-ember-500" : "bg-white/[0.09]")} />
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
          <p className="mt-1.5 font-mono text-[11px] tracking-[0.16em] text-ember-500 uppercase sm:hidden">{phase}</p>
        </div>

        {remaining > 300 && behindMinutes >= 1 ? (
          <p role="status" className="flex items-center justify-center gap-2 border-t border-line px-4 py-1.5 text-center text-[12.5px] text-mid">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn-500" />
            About {behindMinutes} min behind the suggested pace.
          </p>
        ) : null}
        {remaining <= 300 ? (
          <p
            role="status"
            className={cn(
              "border-t px-4 py-1.5 text-center text-[12.5px] font-medium",
              remaining <= 60 ? "border-alert-500/30 bg-alert-500/10 text-alert-500" : "border-warn-500/25 bg-warn-500/[0.07] text-warn-500",
            )}
          >
            {remaining <= 60 ? "One minute left. The shift will close on the choices you have made." : "Five minutes left."}
          </p>
        ) : null}
      </header>

      <main id="main" key={scene} className="mx-auto max-w-3xl px-4 pt-5 pb-40 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        {scene === "handover" ? <Handover {...props} /> : null}
        {scene === "plan" ? <Plan {...props} /> : null}
        {scene === "replan" ? <Replan {...props} /> : null}
        {scene === "receive" ? <Receive {...props} /> : null}
        {scene === "discrepancy" ? <Discrepancy {...props} /> : null}
        {scene === "data" ? <DataScene {...props} /> : null}
        {scene === "peak" ? <Peak {...props} /> : null}
        {scene === "outcome" ? <Outcome {...props} /> : null}
      </main>
    </div>
  );
}
