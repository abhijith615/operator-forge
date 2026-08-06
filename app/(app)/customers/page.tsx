import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <LockedPanel
      href="/customers"
      contents={[
        "Live complaints with the order behind each one",
        "The hub rating, and every event that moved it today",
        "Repeat customers you are about to lose",
        "What a two-minute delay actually reads like to the person waiting",
      ]}
    />
  );
}
