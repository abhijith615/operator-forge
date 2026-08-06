import type { Metadata } from "next";

import { MissionView } from "@/features/mission/components/mission-view";
import { requireOperator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mission",
  description: "The First Shift — briefing, live floor, and handover.",
};

export default async function MissionPage() {
  const operator = await requireOperator();
  return <MissionView operator={operator} />;
}
