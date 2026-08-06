import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <LockedPanel
      href="/messages"
      contents={[
        "Hub Manager — stretched thin, direct, will not make your decisions for you",
        "Inventory Lead — knows the stock better than the system does, and says so",
        "Customer — the person on the other end of a late order",
        "Typing indicators, read receipts and full conversation history per thread",
      ]}
    />
  );
}
