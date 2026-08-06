import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getOperator } from "@/lib/auth/session";
import { LOGIN_ROUTE, ONBOARDING_ROUTE } from "@/lib/constants/routes";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await getOperator();

  if (!operator) redirect(LOGIN_ROUTE);
  if (!operator.onboarded) redirect(ONBOARDING_ROUTE);

  return <AppShell operator={operator}>{children}</AppShell>;
}
