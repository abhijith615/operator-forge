"use client";

import { useIsUnlocked } from "@/components/shell/availability";
import { LockedPanel } from "@/components/shell/locked-panel";
import { PageShell } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMissionHydrated } from "@/hooks/use-mission";
import { flatNavItems } from "@/lib/constants/navigation";

interface PanelGateProps {
  href: string;
  /** Shown while the panel is still sealed. */
  contents: readonly string[];
  children: React.ReactNode;
}

/**
 * A floor panel is either live or it is honestly empty. This decides which,
 * once — every panel goes through here so the rule cannot drift.
 */
export function PanelGate({ href, contents, children }: PanelGateProps) {
  const hydrated = useMissionHydrated();
  const isUnlocked = useIsUnlocked();
  const item = flatNavItems.find((navItem) => navItem.href === href);

  if (!hydrated) {
    return (
      <PageShell>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-8 h-24 rounded-card" />
        <Skeleton className="mt-5 h-96 rounded-panel" />
      </PageShell>
    );
  }

  if (!item || !isUnlocked(item.availability)) {
    return <LockedPanel href={href} contents={contents} />;
  }

  return <>{children}</>;
}
