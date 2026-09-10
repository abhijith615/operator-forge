import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BAND_RANGE } from "@/lib/challenge/scoring";
import { DIMENSION_LABEL, type Band, type Dimension } from "@/lib/challenge/types";
import type { StoredRun } from "@/lib/challenge/runs";

/**
 * A finished day whose written scorecard was never stored.
 *
 * Runs recorded before `challenge_runs.result` existed hold a score, a band, a
 * signature and five numbers — and nothing else. This shows exactly that. The
 * prose that went with those numbers is gone, and writing fresh prose against
 * an old score would be inventing feedback for a shift nobody can replay.
 */
export function RunSummary({ run }: { run: StoredRun }) {
  const range = BAND_RANGE[run.band as Band];

  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
          Shift complete
        </p>
        <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi">
          You ran a breakfast peak.
        </h1>
      </section>

      <section className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          Operator Forge Operational Readiness Score
        </p>
        <p className="mt-3 text-[56px] leading-none font-semibold tracking-[-0.05em] text-hi tabular-nums">
          {run.score}
          <span className="text-[22px] text-lo">/100</span>
        </p>
        <p className="mt-3 text-[14px] font-medium text-ember-400">{run.band}</p>
        {range ? (
          <p className="mt-1 font-mono text-[11px] text-faint">Band range {range}</p>
        ) : null}
        <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">
          A practice assessment from a simulated shift. Not an employment
          certification.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          Decision signature
        </h2>
        <p className="mt-2 text-[19px] leading-tight font-semibold tracking-[-0.02em] text-hi">
          {run.signature}
        </p>
      </section>

      <section>
        <h2 className="font-mono text-[10px] tracking-[0.18em] text-lo uppercase">
          Competencies
        </h2>
        <ul className="mt-3 space-y-3.5">
          {Object.entries(run.competencies).map(([dimension, score]) => (
            <li key={dimension}>
              <div className="flex items-baseline gap-3">
                <span className="text-[13.5px] font-medium text-hi">
                  {DIMENSION_LABEL[dimension as Dimension] ?? dimension}
                </span>
                <span className="ml-auto font-mono text-[15px] font-semibold text-hi tabular-nums">
                  {score}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  className={
                    score >= 80
                      ? "h-full rounded-full bg-ion-500"
                      : score >= 60
                        ? "h-full rounded-full bg-ember-500"
                        : "h-full rounded-full bg-warn-500"
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[12.5px] leading-relaxed text-faint">
        This run was recorded before the written scorecard was kept, so the
        feedback that accompanied these numbers is no longer available.
      </p>

      <div className="space-y-2.5">
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/challenge">Back to the challenge</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/challenge/leaderboard">See where you stand</Link>
        </Button>
      </div>
    </div>
  );
}
