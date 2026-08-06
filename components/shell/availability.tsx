import { Lock, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

export function AvailabilityBadge({
  availability,
}: {
  availability: NavAvailability;
}) {
  if (availability === "open") {
    return (
      <Badge tone="ion">
        <Radio />
        Open
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
