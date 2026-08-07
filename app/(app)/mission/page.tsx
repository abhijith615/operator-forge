import type { Metadata } from "next";

import { MissionView } from "@/features/mission/components/mission-view";
import { isOpenAIConfigured } from "@/lib/agents/config";
import { requireOperator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mission",
  description: "The First Shift — briefing, control room, and handover.",
};

export default async function MissionPage() {
  const operator = await requireOperator();
  return <MissionView operator={operator} chatConfigured={isOpenAIConfigured} />;
}
