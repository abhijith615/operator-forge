import type { Metadata } from "next";

import { PanelGate } from "@/components/mission/panel-gate";
import { CustomersPanel } from "@/components/mission/panels/customers-panel";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <PanelGate
      href="/customers"
      contents={[
        "Live complaints with the order behind each one",
        "The store rating, and every event that moved it today",
        "Repeat customers you are about to lose",
        "What a two-minute delay actually reads like to the person waiting",
      ]}
    >
      <CustomersPanel />
    </PanelGate>
  );
}
