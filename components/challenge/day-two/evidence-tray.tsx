"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText, Info, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FINDINGS, TOOL_META } from "@/lib/challenge/day-two/earbuds";
import type { EvidenceItem, FindingId, LoggedFinding } from "@/lib/challenge/day-two/types";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The evidence tray, and the place conclusions get committed.
 *
 * Putting the findings control inside the tray is the argument the whole day
 * is making, expressed as layout: what you are allowed to conclude sits
 * directly beneath what you have actually collected. A learner can still
 * commit to anything at any time — the control is never disabled — because a
 * button that refuses to be pressed measures nothing about the habit of
 * reaching too early.
 */
export function EvidenceTray({
  evidence,
  findings,
  onLogFinding,
}: {
  evidence: EvidenceItem[];
  findings: LoggedFinding[];
  onLogFinding: (id: FindingId) => void;
}) {
  const reduced = useReducedMotion();
  const [composing, setComposing] = React.useState(false);
  const committed = new Set(findings.map((f) => f.id));

  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <FileText className="size-3.5 text-ember-500" aria-hidden />
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
          Evidence
        </span>
        <span
          data-readout
          className="ml-auto font-mono text-[12px] text-hi tabular-nums"
          aria-live="polite"
        >
          {evidence.length} {evidence.length === 1 ? "item" : "items"}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {evidence.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12.5px] leading-relaxed text-lo">
            Nothing collected yet. Open the records and keep what actually
            carries weight.
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {evidence.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={reduced ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: easing.outExpo }}
                  className={cn(
                    "rounded-card border bg-elevated p-3",
                    item.weight === "circumstantial"
                      ? "border-l-2 border-line border-l-warn-500/70"
                      : "border-l-2 border-line border-l-ion-500/70",
                  )}
                >
                  <p className="flex items-center gap-1.5">
                    <span className="font-mono text-[9.5px] tracking-[0.12em] text-faint uppercase">
                      {TOOL_META[item.source].label}
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full border px-1.5 py-px font-mono text-[9px] tracking-[0.1em] uppercase",
                        item.weight === "circumstantial"
                          ? "border-warn-500/40 text-warn-500"
                          : "border-ion-500/35 text-ion-400",
                      )}
                    >
                      {item.weight === "circumstantial" ? "Circumstantial" : "Material"}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-snug font-medium text-hi">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-mid">{item.detail}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* ── Findings ── */}
      <div className="shrink-0 border-t border-line p-3">
        {findings.length > 0 ? (
          <ul className="mb-2.5 space-y-1.5">
            {findings.map((finding) => {
              const spec = FINDINGS.find((f) => f.id === finding.id);
              return (
                <li
                  key={finding.id}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    finding.supported
                      ? "border-ion-500/35 bg-ion-500/[0.06]"
                      : "border-warn-500/40 bg-warn-500/[0.05]",
                  )}
                >
                  <p className="text-[12px] leading-snug font-medium text-hi">
                    {spec?.label ?? finding.id}
                  </p>
                  {/* Said only once the conclusion is committed. Warning
                      somebody off in advance teaches them nothing about the
                      instinct they just acted on. */}
                  {!finding.supported ? (
                    <p className="mt-1 flex gap-1.5 text-[11px] leading-relaxed text-warn-500">
                      <Info className="mt-px size-3 shrink-0" aria-hidden />
                      {finding.id === "staff_theft"
                        ? "Presence near secure stock is not proof of loss. Recorded as a conclusion reached ahead of the evidence."
                        : "Recorded without supporting evidence in the tray."}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {composing ? (
          <div className="space-y-1.5">
            <p className="px-1 pb-1 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
              Record what you believe happened
            </p>
            {FINDINGS.map((finding) => (
              <button
                key={finding.id}
                type="button"
                disabled={committed.has(finding.id)}
                onClick={() => {
                  onLogFinding(finding.id);
                  setComposing(false);
                }}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-[12px] leading-snug transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none",
                  committed.has(finding.id)
                    ? "pointer-events-none border-line text-faint"
                    : "border-line bg-surface text-mid hover:border-ember-500/45 hover:text-hi",
                )}
              >
                {finding.label}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setComposing(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setComposing(true)}
          >
            <Scale className="size-3.5" aria-hidden />
            Record a finding
          </Button>
        )}
      </div>
    </div>
  );
}
