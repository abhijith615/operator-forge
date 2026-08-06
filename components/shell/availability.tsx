"use client";

import { Lock, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMissionHydrated } from "@/hooks/use-mission";
import { useMissionStore } from "@/stores/mission-store";
import type { NavAvailability } from "@/types/navigation";

export const AVAILABILITY_COPY: Record<
  NavAvailability,
  { label: string; detail: string }
> = {
  open: {
    label: "Open",
    detail: "Available now.",
  },
  "in-mission": {
    label: "Comes online at 00:00",
    detail:
      "This panel wakes up the moment the shift starts. Before that there is nothing on the floor to look at.",
  },
  "post-mission": {
    label: "Written after the shift",
    detail:
      "This is built from what you actually did during the mission, so it stays sealed until the clock runs out.",
  },
};

/** Whether a panel is usable given where the operator is in their shift. */
export function useIsUnlocked(): (availability: NavAvailability) => boolean {
  const hydrated = useMissionHydrated();
  const status = useMissionStore((state) => state.status);

  return (availability) => {
    if (availability === "open") return true;
    if (!hydrated) return false;
    if (availability === "in-mission") return status === "live" || status === "complete";
    return status === "complete";
  };
}

/**
 * Only rendered on a panel that is standing by, so it never claims "Live".
 * `pending` marks the case where the gate has opened but the panel itself is
 * not built yet.
 */
export function AvailabilityBadge({
  availability,
  pending = false,
}: {
  availability: NavAvailability;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <Badge tone="ember">
        <Radio />
        Not built yet
      </Badge>
    );
  }

  return (
    <Badge tone="neutral">
      <Lock />
      {availability === "in-mission" ? "Opens at 00:00" : "After the shift"}
    </Badge>
  );
}
