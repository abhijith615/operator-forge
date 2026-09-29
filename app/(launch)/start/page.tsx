import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LaunchSequence } from "@/components/mission/launch-sequence";
import { getOperator } from "@/lib/auth/session";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";
import { canRunShift } from "@/lib/mission/attempts";

export const metadata: Metadata = {
  title: "Handover",
  description: "The message, the video, and the count-in.",
};

export default async function StartPage() {
  const operator = await getOperator();
  if (!operator) redirect(LOGIN_ROUTE);
  if (!operator.onboarded) redirect(ONBOARDING_ROUTE);
  // The gate that actually holds. Clearing site data resets the browser's copy
  // of the run and lands somebody back here; the finished shift is in the
  // database, so this is where a second attempt stops.
  if (!(await canRunShift())) redirect("/genome");

  return (
    <main id="main">
      <LaunchSequence operatorId={operator.id} />
    </main>
  );
}
