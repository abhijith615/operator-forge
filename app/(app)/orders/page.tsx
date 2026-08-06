import type { Metadata } from "next";

import { PanelGate } from "@/components/mission/panel-gate";
import { OrdersPanel } from "@/components/mission/panels/orders-panel";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <PanelGate
      href="/orders"
      contents={[
        "The live queue, with promised times and what is about to breach",
        "OTIF as it moves, not as a monthly average",
        "Which orders are waiting on a picker, a rider, or a decision from you",
        "Cancellations and refunds, and what they cost the hub",
      ]}
    >
      <OrdersPanel />
    </PanelGate>
  );
}
