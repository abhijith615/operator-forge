import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getOperator } from "@/lib/auth/session";
import { LOGIN_ROUTE, safeNext } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Join the roster",
  description: "Two details before your first shift.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const operator = await getOperator();
  const { next } = await searchParams;
  const destination = safeNext(next);

  if (!operator) redirect(LOGIN_ROUTE);
  if (operator.onboarded) redirect(destination);

  return (
    <OnboardingForm
      email={operator.email}
      defaultName={operator.fullName}
      defaultWhatsapp={operator.whatsapp ?? ""}
      next={destination}
    />
  );
}
