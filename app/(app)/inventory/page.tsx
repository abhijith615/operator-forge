import type { Metadata } from "next";

import { PanelGate } from "@/components/mission/panel-gate";
import { InventoryPanel } from "@/components/mission/panels/inventory-panel";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <PanelGate
      href="/inventory"
      contents={[
        "Stock on hand per SKU, and what the system believes you have",
        "Shrinkage, mismatches and the cycle counts that would settle them",
        "Putaway backlog and which bays are blocking the pick path",
        "Every operations term here is clickable, with a plain explanation",
      ]}
    >
      <InventoryPanel />
    </PanelGate>
  );
}
