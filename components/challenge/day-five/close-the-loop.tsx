"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { CaseHeading, NodeMark } from "@/components/challenge/day-five/ui";
import { Button } from "@/components/ui/button";
import { linkFits, loopComplete } from "@/lib/challenge/day-five/engine";
import { CONTROLS, INCIDENTS } from "@/lib/challenge/day-five/scenario";
import { CASE_IDS, type ControlId, type Day5State, type IncidentId } from "@/lib/challenge/day-five/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const CONTROL_IDS = Object.keys(CONTROLS) as ControlId[];

/**
 * Customer recovery is not the end.
 *
 * Four incidents on the left, ten standing controls on the right, and the
 * operator connects them. When a link fits, that customer's journey stops
 * reading failure → refund and starts reading control → prevented — which is
 * the only place in the day where a fix costs nothing because it already
 * happened.
 */
export function CloseTheLoop({
  state,
  time,
  onLink,
  onConfirm,
}: {
  state: Day5State;
  time: string;
  onLink: (incident: IncidentId, control: ControlId | null) => void;
  onConfirm: () => void;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState<IncidentId | null>(null);
  const links = state.loop.links;
  const used = new Set(Object.values(links));
  const complete = loopComplete(state.loop);

  return (
    <section aria-label="Close the loop" className="space-y-4">
      <CaseHeading
        time={time}
        eyebrow="Close the loop"
        title="Customer recovery is not the end."
        sub="Four failures tonight. Each one has a control that would have stopped it before anybody had to recover anything."
        tone="ion"
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── What happened ── */}
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Tonight&rsquo;s failures</p>
          <ul className="mt-2 space-y-2">
            {CASE_IDS.map((id) => {
              const incident = INCIDENTS[id];
              const control = links[id];
              const fits = linkFits(id, control);
              const selected = active === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={state.loop.confirmed}
                    onClick={() => setActive(selected ? null : id)}
                    className={cn(
                      "w-full rounded-card border p-3 text-left transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      selected
                        ? "border-ember-500/70 bg-ember-500/[0.08]"
                        : control
                          ? fits
                            ? "border-ion-500/45 bg-ion-500/[0.05]"
                            : "border-warn-500/45 bg-warn-500/[0.05]"
                          : "border-line bg-elevated hover:border-line-bright",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-hi">{incident.label}</span>
                      {control ? <NodeMark state={fits ? "clear" : "risk"} /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-lo">{incident.failure}</span>

                    <AnimatePresence initial={false} mode="wait">
                      <motion.span
                        key={control ?? "none"}
                        initial={reduced ? false : { opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: easing.outExpo }}
                        className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase"
                      >
                        {control ? (
                          <>
                            <ShieldCheck className={cn("size-3", fits ? "text-ion-400" : "text-warn-500")} aria-hidden />
                            <span className={fits ? "text-ion-400" : "text-warn-500"}>
                              {fits ? "Failure prevented" : "Linked, but it would not have caught this"}
                            </span>
                          </>
                        ) : (
                          <span className="text-faint">Failure → refund</span>
                        )}
                      </motion.span>
                    </AnimatePresence>

                    {control ? (
                      <span className="mt-1.5 block text-[11px] text-mid">{CONTROLS[control].label}</span>
                    ) : null}
                  </button>

                  {control && !state.loop.confirmed ? (
                    <button
                      type="button"
                      onClick={() => onLink(id, null)}
                      className="mt-1 rounded px-1 text-[11px] text-lo underline-offset-4 hover:text-mid hover:underline focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
                    >
                      Unlink
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── What would have stopped it ── */}
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Preventive controls</p>
          <ul className="mt-2 grid gap-1.5">
            {CONTROL_IDS.map((control) => {
              const spec = CONTROLS[control];
              const taken = used.has(control);
              const disabled = state.loop.confirmed || active === null;
              return (
                <li key={control}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (active) {
                        onLink(active, control);
                        setActive(null);
                      }
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-2.5 rounded-card border px-3 py-2 text-left transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-45",
                      taken ? "border-ion-500/40 bg-ion-500/[0.05]" : "border-line bg-elevated hover:border-line-bright",
                    )}
                  >
                    <ShieldCheck
                      className={cn("mt-0.5 size-3.5 shrink-0", taken ? "text-ion-400" : "text-faint")}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-hi">{spec.label}</span>
                      <span className="block text-[10.5px] leading-snug text-lo">{spec.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11.5px] text-faint">
            {active
              ? `Choose the control that would have stopped ${INCIDENTS[active].label.toLowerCase()}.`
              : "Pick a failure on the left, then the control that would have caught it."}
          </p>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!complete}
        onClick={onConfirm}
      >
        {complete ? "See your assessment" : "Link all four to continue"}
        <ArrowRight />
      </Button>
    </section>
  );
}
