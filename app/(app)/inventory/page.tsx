import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <LockedPanel
      href="/inventory"
      contents={[
        "Stock on hand per SKU, and what the system believes you have",
        "Shrinkage, mismatches and the cycle counts that would settle them",
        "Putaway backlog and which bays are blocking the pick path",
        "Every operations term here is clickable, with a plain explanation",
      ]}
    />
  );
}
