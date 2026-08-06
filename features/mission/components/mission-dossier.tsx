import { Clock3, Factory, MapPin, ShieldAlert, UserRound } from "lucide-react";

import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { FIRST_SHIFT } from "@/lib/constants/mission";

const SPECS = [
  { icon: UserRound, label: "Role", value: FIRST_SHIFT.role },
  { icon: Factory, label: "Industry", value: FIRST_SHIFT.industry },
  { icon: MapPin, label: "Hub", value: FIRST_SHIFT.location },
  { icon: Clock3, label: "Duration", value: `${FIRST_SHIFT.durationMinutes} minutes` },
  { icon: ShieldAlert, label: "Difficulty", value: FIRST_SHIFT.difficulty },
] as const;

export function MissionDossier() {
  return (
    <SpotlightCard className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone="ember">{FIRST_SHIFT.codename}</Badge>
        <Badge tone="neutral">Single attempt</Badge>
        <Badge tone="neutral">No pause</Badge>
      </div>

      <h3 className="mt-5 text-[28px] leading-tight font-semibold tracking-[-0.035em] text-hi sm:text-[34px]">
        {FIRST_SHIFT.name}
      </h3>
      <p className="mt-2 text-[15px] text-ember-400/90">{FIRST_SHIFT.tagline}</p>
      <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-mid">
        {FIRST_SHIFT.summary}
      </p>

      <RevealGroup
        gap={0.04}
        className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
      >
        {SPECS.map((spec) => (
          <RevealItem key={spec.label} className="bg-surface px-5 py-4">
            <div className="flex items-center gap-2 text-lo">
              <spec.icon className="size-3.5" />
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
                {spec.label}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] text-hi">{spec.value}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </SpotlightCard>
  );
}

export function MissionObjectives() {
  return (
    <div className="panel sheen p-6">
      <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
        What you are responsible for
      </p>
      <RevealGroup gap={0.06} className="mt-5 space-y-4">
        {FIRST_SHIFT.objectives.map((objective, index) => (
          <RevealItem key={objective} className="flex gap-3.5">
            <span className="mt-0.5 font-mono text-[10.5px] text-faint tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-[14px] leading-relaxed text-mid">{objective}</p>
          </RevealItem>
        ))}
      </RevealGroup>
      <p className="mt-6 border-t border-line pt-4 text-[12.5px] leading-relaxed text-lo">
        None of these have a single correct answer. You will be read on how you
        got there, not on where you landed.
      </p>
    </div>
  );
}
