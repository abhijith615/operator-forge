import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OperatorProfileView } from "@/components/challenge/day-six/operator-profile";
import { isAdmin } from "@/lib/admin/queries";
import { requireChallengeAccess } from "@/lib/challenge/access";
import { buildOperatorProfile } from "@/lib/challenge/day-six/profile";
import { readWeek } from "@/lib/challenge/runs";
import { dayIsOpen } from "@/lib/constants/offer";

export const metadata: Metadata = {
  title: "Day 6 · Your Operator Profile",
  description:
    "Five simulations read together: ten skills, your signature, and the day scorecards behind every number.",
};

export const dynamic = "force-dynamic";

export default async function DaySixPage() {
  const operator = await requireChallengeAccess("/challenge/day-6");

  // Dated Day 6 everywhere it is described, so it opens on Day 6. Admins are
  // let in early because they are the ones checking that it reads correctly.
  if (!dayIsOpen(6) && !(await isAdmin())) redirect("/challenge");

  // Deliberately not gated on five finished days. A partial week still has a
  // profile in it, the page says which readings it cannot take yet, and the
  // unplayed days link straight to the simulation that would fill them in.
  const week = await readWeek();
  const profile = buildOperatorProfile(week);

  return (
    <OperatorProfileView
      profile={profile}
      firstName={operator.fullName.split(" ")[0] ?? "Operator"}
    />
  );
}
