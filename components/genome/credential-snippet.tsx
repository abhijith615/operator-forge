"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { capabilities } from "@/lib/constants/site";
import { BAND_LABEL } from "@/types/genome";
import { cn } from "@/lib/utils";
import type { OperatorGenome } from "@/types/genome";

/**
 * Something to paste into a CV or a LinkedIn profile.
 *
 * Every number here comes out of the run. Nothing is rounded up, nothing is
 * called a certification, and the wording avoids anything a hiring manager
 * could later find untrue — this is a simulation result, and saying so plainly
 * is what makes it worth putting on a CV at all.
 */

function nameOf(id: string): string {
  return capabilities.find((capability) => capability.id === id)?.name ?? id;
}

function topThree(genome: OperatorGenome): string[] {
  return [...genome.capabilities]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((reading) => reading.name);
}

function buildResume(genome: OperatorGenome): string {
  const { stats } = genome;
  const strengths = topThree(genome).join(", ");
  const otif = Math.round(stats.otifAtClose * 100);

  return [
    "Operator Forge — First Shift (Quick Commerce operations simulation)",
    `Ran a live dark store for a 30-minute shift: ${stats.tasksHandled} operational decisions under a running clock, across inventory, staffing, customer escalations and head office.`,
    `• Operator Rating ${genome.rating} / 1900 · assessed across ten capabilities from the decision record, not a questionnaire`,
    `• Strongest capabilities: ${strengths}`,
    `• Closed the shift at ${otif}% on-time-in-full with a ${stats.ratingAtClose.toFixed(2)} customer rating`,
    `• Median time to decide: ${stats.medianLatency}s, with a peak of ${stats.peakQueue} competing tasks open at once`,
  ].join("\n");
}

function buildLinkedIn(genome: OperatorGenome): string {
  const [first, second] = topThree(genome);
  const otif = Math.round(genome.stats.otifAtClose * 100);

  return [
    `I ran a quick-commerce dark store for 30 minutes in Operator Forge — a live operations simulation, not a quiz.`,
    ``,
    `${genome.stats.tasksHandled} decisions under a running clock. Finished at ${otif}% OTIF with an Operator Rating of ${genome.rating}.`,
    ``,
    `It scored me on how I actually worked rather than what I said I would do. Strongest: ${first} and ${second}. It was also clear about where I was weakest, which was the more useful half.`,
  ].join("\n");
}

function buildHeadline(genome: OperatorGenome): string {
  const top = genome.capabilities.reduce((best, reading) =>
    reading.score > best.score ? reading : best,
  );
  return `Operator Forge · ${genome.signature} · Rating ${genome.rating} · ${BAND_LABEL[top.band]} ${nameOf(top.id)}`;
}

export function CredentialSnippet({ genome }: { genome: OperatorGenome }) {
  const variants = React.useMemo(
    () => [
      { id: "resume", label: "Résumé", body: buildResume(genome) },
      { id: "linkedin", label: "LinkedIn post", body: buildLinkedIn(genome) },
      { id: "headline", label: "One line", body: buildHeadline(genome) },
    ],
    [genome],
  );

  const [active, setActive] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const current = variants[active]!;

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, denied permission). The text is
      // selectable on screen, so there is still a way through.
    }
  }

  return (
    <section className="panel mt-8 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[14.5px] font-medium text-hi">Put this on your CV</h3>
        <div className="ml-auto flex gap-1">
          {variants.map((variant, index) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11.5px] transition-colors duration-150",
                index === active ? "bg-white/[0.09] text-hi" : "text-lo hover:text-mid",
              )}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-mid">
        Built from your own run. Every figure is one you produced — nothing is
        rounded up, and it does not call itself a certification, because it
        isn&rsquo;t one.
      </p>

      <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-line bg-void/60 p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-mid select-all">
        {current.body}
      </pre>

      <div className="mt-3 flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : `Copy ${current.label.toLowerCase()}`}
        </Button>
        <span className="text-[11.5px] text-faint">
          Or select the text above.
        </span>
      </div>
    </section>
  );
}
