import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <LockedPanel
      href="/orders"
      contents={[
        "The live queue, with promised times and what is about to breach",
        "OTIF as it moves, not as a monthly average",
        "Which orders are waiting on a picker, a rider, or a decision from you",
        "Cancellations and refunds, and what they cost the hub",
      ]}
    />
  );
}
