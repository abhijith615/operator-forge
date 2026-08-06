import type { Metadata } from "next";

import { LockedPanel } from "@/components/shell/locked-panel";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <LockedPanel
      href="/assistant"
      contents={[
        "A copilot that only knows what the hub has told it — and what you tell it",
        "Markdown, tables and code blocks for anything you ask it to work out",
        "Suggested questions when you are stuck, never answers you did not ask for",
        "Every prompt you write is kept, because how you ask is part of the read",
      ]}
    />
  );
}
