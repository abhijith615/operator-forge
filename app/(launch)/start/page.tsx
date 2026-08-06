import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LaunchSequence } from "@/components/mission/launch-sequence";
import { getOperator } from "@/lib/auth/session";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Handover",
  description: "The message, the video, and the count-in.",
};

export default async function StartPage() {
  const operator = await getOperator();
  if (!operator) redirect(LOGIN_ROUTE);
  if (!operator.onboarded) redirect(ONBOARDING_ROUTE);

  return (
    <main id="main">
      <LaunchSequence operatorId={operator.id} />
    </main>
  );
}
