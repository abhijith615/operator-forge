"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AVAILABILITY_COPY,
  AvailabilityBadge,
  useIsUnlocked,
} from "@/components/shell/availability";
import { PageHeader, PageShell } from "@/components/shell/page-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { flatNavItems } from "@/lib/constants/navigation";
import { GridField } from "@/components/visuals/aurora";

interface LockedPanelProps {
  href: string;
  /** What this panel will hold once it opens. Concrete, not marketing. */
  contents: readonly string[];
}

/**
 * Standing state for a panel that has nothing to show yet. Every in-mission
 * surface is genuinely empty before the shift starts — this says so precisely
 * rather than faking data.
 */
export function LockedPanel({ href, contents }: LockedPanelProps) {
  const isUnlocked = useIsUnlocked();
  const item = flatNavItems.find((navItem) => navItem.href === href);
  if (!item) return null;

  // The gate has opened but the panel behind it does not exist yet. Saying so
  // is better than letting the "sealed until the clock runs out" copy lie.
  const pending = isUnlocked(item.availability);

  const copy = pending
    ? {
        label: "Arrives in Phase 3",
        detail:
          "Your shift is on the record and the raw material for this is already captured. The panel itself has not been built yet.",
      }
    : AVAILABILITY_COPY[item.availability];

  return (
    <PageShell>
      <PageHeader
        eyebrow={copy.label}
        title={item.label}
        description={item.description}
        actions={
          <AvailabilityBadge availability={item.availability} pending={pending} />
        }
      />

      <Reveal className="panel sheen grain relative mt-10 overflow-hidden">
        <GridField className="[mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black,transparent_75%)] opacity-60" />

        <div className="relative flex flex-col items-center px-6 py-16 text-center sm:py-20">
          <div className="relative grid size-14 place-items-center rounded-2xl border border-line-strong bg-obsidian">
            <item.icon className="size-6 text-lo" />
            <span className="absolute inset-0 -z-10 rounded-2xl bg-ember-500/20 blur-xl" />
          </div>

          <h3 className="mt-6 max-w-md text-[19px] font-medium tracking-[-0.02em] text-hi text-balance">
            {copy.label}
          </h3>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-mid text-balance">
            {copy.detail}
          </p>

          <Button asChild variant="secondary" size="md" className="mt-8">
            <Link href="/mission">
              Back to the briefing
              <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </Reveal>

      <div className="mt-10">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
          What lands here
        </p>
        <RevealGroup gap={0.05} className="mt-4 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
          {contents.map((entry) => (
            <RevealItem key={entry} className="flex gap-3 bg-surface px-5 py-4">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ember-500/70" />
              <p className="text-[13.5px] leading-relaxed text-mid">{entry}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </PageShell>
  );
}
