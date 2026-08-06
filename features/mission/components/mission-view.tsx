"use client";

import { MissionConsole } from "@/components/mission/mission-console";
import { Reveal } from "@/components/motion/reveal";
import { PageShell } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefingGreeting } from "@/features/mission/components/briefing-greeting";
import { LaunchCard } from "@/features/mission/components/launch-card";
import {
  MissionDossier,
  MissionObjectives,
} from "@/features/mission/components/mission-dossier";
import { Readiness } from "@/features/mission/components/readiness";
import { ShiftComplete } from "@/features/mission/components/shift-complete";
import { useMissionHydrated } from "@/hooks/use-mission";
import { useMissionStore } from "@/stores/mission-store";
import type { Operator } from "@/types/operator";

/**
 * One route, three states. The operator never navigates between them — the
 * clock does.
 */
export function MissionView({ operator }: { operator: Operator }) {
  const hydrated = useMissionHydrated();
  const status = useMissionStore((state) => state.status);
  const firstName = operator.fullName.split(" ")[0] ?? "Operator";

  if (!hydrated) return <MissionSkeleton />;
  if (status === "live") return <MissionConsole firstName={firstName} />;
  if (status === "complete") return <ShiftComplete />;

  return <Briefing operator={operator} firstName={firstName} />;
}

function Briefing({ operator, firstName }: { operator: Operator; firstName: string }) {
  return (
    <PageShell>
      <BriefingGreeting firstName={firstName} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Reveal>
          <MissionDossier />
        </Reveal>

        <div className="grid content-start gap-6">
          <LaunchCard />
          <Readiness operator={operator} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <MissionObjectives />
        </Reveal>
        <Reveal delay={0.06}>
          <div className="panel sheen h-full p-6">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
              How you will be read
            </p>
            <p className="mt-5 text-[14.5px] leading-relaxed text-mid">
              There is no mark at the end of this. What you get is an Operator
              Genome — a portrait of how you worked, drawn from the order you
              investigated things, the questions you asked, when you escalated,
              and what you deliberately left alone.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-mid">
              Ten capabilities, none of them scored out of a hundred. Written
              only after the clock runs out.
            </p>
            <p className="mt-6 border-t border-line pt-4 text-[12.5px] leading-relaxed text-lo">
              Everything you do during the shift is recorded so the debrief can
              quote you back to yourself. Nothing is shown to you mid-mission.
            </p>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}

function MissionSkeleton() {
  return (
    <PageShell>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-8 w-72" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-96 rounded-panel" />
        <div className="grid content-start gap-6">
          <Skeleton className="h-52 rounded-panel" />
          <Skeleton className="h-64 rounded-panel" />
        </div>
      </div>
    </PageShell>
  );
}
