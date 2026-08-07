import type { Metadata } from "next";

import { GenomeView } from "@/components/genome/genome-view";
import { requireOperator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Genome",
  description: "How you operated, across ten capabilities.",
};

export default async function GenomePage() {
  const operator = await requireOperator();
  const firstName = operator.fullName.split(" ")[0] ?? "Operator";
  return <GenomeView firstName={firstName} />;
}
