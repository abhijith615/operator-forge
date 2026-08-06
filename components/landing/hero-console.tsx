"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bike, PackageCheck, ShoppingBag, Star } from "lucide-react";

import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The instrument strip under the headline. A looping, deterministic preview of
 * what the hub console feels like — not live data, and never presented as such.
 */

const TILES = [
  { label: "Live orders", icon: ShoppingBag, values: [128, 134, 141, 137], tone: "ember" },
  { label: "Riders out", icon: Bike, values: [22, 24, 21, 23], tone: "flux" },
  { label: "OTIF", icon: PackageCheck, values: [96, 94, 91, 93], suffix: "%", tone: "ion" },
  { label: "Rating", icon: Star, values: [4.6, 4.5, 4.5, 4.4], decimals: 1, tone: "warn" },
] as const;

const TONE_CLASS = {
  ember: "text-ember-500",
  flux: "text-flux-400",
  ion: "text-ion-400",
  warn: "text-warn-500",
} as const;

const FEED = [
  { time: "09:02", text: "2 pickers marked absent", tone: "alert" },
  { time: "09:07", text: "Customer complaint · order #4471", tone: "warn" },
  { time: "09:12", text: "Rain warning issued for the zone", tone: "info" },
  { time: "09:15", text: "Inventory mismatch on 6 SKUs", tone: "alert" },
] as const;

const FEED_TONE = {
  alert: "bg-alert-500",
  warn: "bg-warn-500",
  info: "bg-info-500",
} as const;

export function HeroConsole() {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 42, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1.4, ease: easing.outExpo, delay: 0.55 }}
      style={{ perspective: 1400 }}
      className="mx-auto mt-16 w-full max-w-5xl px-4 sm:px-6"
    >
      <div className="panel sheen grain relative overflow-hidden p-2 shadow-[0_50px_120px_-50px_rgba(0,0,0,1)]">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/12" />
            <span className="size-2.5 rounded-full bg-white/12" />
            <span className="size-2.5 rounded-full bg-white/12" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-full border border-line px-3 py-1">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-ion-500" />
              <span className="relative inline-flex size-1.5 rounded-full bg-ion-500" />
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.14em] text-lo uppercase">
              Hub 114 · Shift live
            </span>
          </div>
          <span
            data-readout
            className="font-mono text-[11px] text-faint tabular-nums"
            aria-hidden
          >
            T−41:18
          </span>
        </div>

        <div className="grid gap-2 rounded-[14px] bg-obsidian/60 p-2 lg:grid-cols-[1.55fr_1fr]">
          {/* readouts */}
          <div className="grid grid-cols-2 gap-2">
            {TILES.map((tile) => {
              const value = tile.values[step % tile.values.length] ?? tile.values[0];
              const decimals = "decimals" in tile ? tile.decimals : 0;
              const suffix = "suffix" in tile ? tile.suffix : "";
              return (
                <div
                  key={tile.label}
                  className="relative overflow-hidden rounded-xl border border-line bg-surface/80 p-4"
                >
                  <div className="flex items-center gap-2">
                    <tile.icon className={cn("size-3.5", TONE_CLASS[tile.tone])} />
                    <span className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
                      {tile.label}
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden">
                    <motion.div
                      key={`${tile.label}-${step}`}
                      initial={{ y: reduced ? 0 : "100%", opacity: reduced ? 1 : 0 }}
                      animate={{ y: "0%", opacity: 1 }}
                      transition={{ duration: 0.6, ease: easing.outExpo }}
                      data-readout
                      className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-hi tabular-nums"
                    >
                      {value.toFixed(decimals)}
                      <span className="text-lo">{suffix}</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* activity feed */}
          <div className="rounded-xl border border-line bg-surface/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-medium tracking-[0.12em] text-lo uppercase">
                Timeline
              </span>
              <span className="font-mono text-[10px] text-faint">TODAY</span>
            </div>
            <ul className="mt-4 space-y-3.5">
              {FEED.map((entry, index) => (
                <motion.li
                  key={entry.time}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{
                    opacity: index <= step ? 1 : 0.28,
                    x: 0,
                  }}
                  transition={{ duration: 0.5, ease: easing.outExpo }}
                  className="flex gap-3"
                >
                  <span className="relative mt-1.5 flex">
                    <span
                      className={cn("size-1.5 rounded-full", FEED_TONE[entry.tone])}
                    />
                    {index === step ? (
                      <span
                        className={cn(
                          "absolute inset-0 animate-ping-slow rounded-full",
                          FEED_TONE[entry.tone],
                        )}
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10.5px] text-faint tabular-nums">
                      {entry.time}
                    </div>
                    <div className="truncate text-[13px] text-mid">{entry.text}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
