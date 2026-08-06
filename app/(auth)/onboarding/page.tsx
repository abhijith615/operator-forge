import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getOperator } from "@/lib/auth/session";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Join the roster",
  description: "Two details before your first shift.",
};

export default async function OnboardingPage() {
  const operator = await getOperator();

  if (!operator) redirect(LOGIN_ROUTE);
  if (operator.onboarded) redirect(HOME_ROUTE);

  return (
    <OnboardingForm
      email={operator.email}
      defaultName={operator.fullName}
      defaultWhatsapp={operator.whatsapp ?? ""}
    />
  );
}
