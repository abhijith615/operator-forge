import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { OperatorScope } from "@/components/shell/operator-scope";
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

  return (
    <>
      <OperatorScope operatorId={operator.id} />
      <AppShell operator={operator}>{children}</AppShell>
    </>
  );
}
