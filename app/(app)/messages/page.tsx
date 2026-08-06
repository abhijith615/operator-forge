import type { Metadata } from "next";

import { MessagesPanel } from "@/components/chat/messages-panel";
import { PanelGate } from "@/components/mission/panel-gate";
import { isOpenAIConfigured } from "@/lib/agents/config";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PanelGate
      href="/messages"
      contents={[
        "Hub Manager — stretched thin, direct, will not make your decisions for you",
        "Inventory Lead — knows the stock better than the system does, and says so",
        "Customer — the person on the other end of a late order",
        "Typing indicators, read receipts and full conversation history per thread",
      ]}
    >
      <MessagesPanel configured={isOpenAIConfigured} />
    </PanelGate>
  );
}
