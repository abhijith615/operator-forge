"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDay4 } from "@/lib/challenge/day-four/engine";
import { metricsOf } from "@/lib/challenge/day-four/floor";
import { OPENING_MESSAGES, STORE, VEHICLES, VEHICLE_ORDER } from "@/lib/challenge/day-four/scenario";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STATUS: Record<string, string> = { dairy: "At dock", frozen: "Waiting", grocery: "At yard · next" };

/**
 * 10:18 AM. The reveal runs about four seconds and a tap skips it; the first
 * real decision is on the floor map inside half a minute.
 */
export function DayFourOpening({ onStart }: { onStart: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(reduced ? 5 : 0);
  const opening = React.useMemo(() => metricsOf(createDay4()), []);

  React.useEffect(() => {
    if (reduced) return;
    const timers = [500, 1300, 2200, 3000, 3800].map((ms, index) =>
      window.setTimeout(() => setStep((s) => Math.max(s, index + 1)), ms),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced]);

  const skip = () => setStep(5);
  const rise = (visible: boolean) => ({
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    transition: { duration: 0.5, ease: easing.outExpo },
  });

  const status = [
    { label: "Dock occupancy", value: `${Math.round(opening.dockOccupancy)}%`, tone: "alert" },
    { label: "Inbound floor cartons", value: String(Math.round(opening.floorCartons)), tone: "warn" },
    { label: "Aisle C blocked", value: `${Math.round(opening.aisleBlocked * 100)}%`, tone: "warn" },
    { label: "CTD", value: `${opening.ctd} sec`, tone: "neutral" },
    { label: "GRN pending", value: "3 loads", tone: "neutral" },
  ];

  return (
    // Tapping anywhere skips the reveal; keyboard users get the button below.
    <div className="flex min-h-dvh flex-col bg-void" onClick={step < 5 ? skip : undefined}>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10">
        <motion.p
          {...rise(true)}
          data-readout
          className="font-mono text-[clamp(2.6rem,9vw,4.6rem)] leading-none font-semibold tracking-[-0.04em] text-hi tabular-nums"
        >
          10:18 AM
        </motion.p>

        <motion.div {...rise(step >= 1)} className="mt-5">
          <p className="font-mono text-[11px] tracking-[0.3em] text-alert-500 uppercase">Day 4 · {STORE} · Inbound surge</p>
          <h1 className="mt-2 text-[clamp(2.2rem,7vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-hi">
            Clear the floor
          </h1>
          <p className="mt-2 text-[16px] leading-relaxed text-mid">
            Three vehicles have arrived. Peak starts in 42 minutes.
          </p>
        </motion.div>

        <motion.ul {...rise(step >= 2)} className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Incoming loads">
          {VEHICLE_ORDER.map((id) => {
            const vehicle = VEHICLES[id];
            return (
              <li
                key={id}
                className={cn(
                  "rounded-card border bg-surface p-3",
                  vehicle.temperature === "Chilled"
                    ? "border-info-500/40"
                    : vehicle.temperature === "Frozen"
                      ? "border-flux-400/40"
                      : "border-line-strong",
                )}
              >
                <p className="text-[13px] font-semibold text-hi uppercase">{vehicle.name}</p>
                <p className="mt-1 font-mono text-[12px] text-mid">
                  {vehicle.load} · {vehicle.temperature}
                </p>
                <p className="mt-1.5 font-mono text-[10.5px] tracking-[0.08em] text-ember-400 uppercase">{STATUS[id]}</p>
              </li>
            );
          })}
        </motion.ul>

        <motion.dl {...rise(step >= 3)} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {status.map((item) => (
            <div key={item.label} className="rounded-card border border-line bg-surface px-3 py-2.5">
              <dt className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">{item.label}</dt>
              <dd
                data-readout
                className={cn(
                  "mt-1 text-[18px] leading-none font-semibold tabular-nums",
                  item.tone === "alert" ? "text-alert-500" : item.tone === "warn" ? "text-warn-500" : "text-hi",
                )}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </motion.dl>

        <motion.div {...rise(step >= 4)} className="mt-5 space-y-2">
          <div className="rounded-card border border-warn-500/35 bg-warn-500/[0.05] p-3.5">
            <p className="font-mono text-[10px] tracking-[0.14em] text-warn-500 uppercase">Floor Lead · 10:18 AM</p>
            <p className="mt-1 text-[15px] text-hi">{OPENING_MESSAGES.floorLead}</p>
          </div>
          <div className="rounded-card border border-ember-500/35 bg-ember-500/[0.05] p-3.5">
            <p className="font-mono text-[10px] tracking-[0.14em] text-ember-500 uppercase">Cluster Manager · 10:18 AM</p>
            {OPENING_MESSAGES.cluster.map((line) => (
              <p key={line} className="mt-1 text-[15px] text-hi">
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {step >= 5 ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easing.outExpo }}
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={onStart} autoFocus>
                Take the floor
                <ArrowRight />
              </Button>
              <p className="text-[12px] leading-relaxed text-faint">
                Fifteen minutes on the clock from here. The floor only moves when you move it.
              </p>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={skip}
              className="mt-7 self-start rounded px-1 text-[11.5px] text-faint hover:text-lo focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              Skip the introduction
            </button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
