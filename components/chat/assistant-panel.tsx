"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { ChatUnavailable } from "@/components/chat/chat-unavailable";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { useIsShiftLive } from "@/hooks/use-mission";
import { ASSISTANT_SUGGESTIONS } from "@/lib/agents/assistant";
import { useChatStore } from "@/stores/chat-store";

export function AssistantPanel({ configured }: { configured: boolean }) {
  const messages = useChatStore((state) => state.threads.assistant ?? []);
  const typing = useChatStore((state) => Boolean(state.typing.assistant));
  const send = useChatStore((state) => state.send);
  const markRead = useChatStore((state) => state.markRead);
  const live = useIsShiftLive();

  React.useEffect(() => {
    markRead("assistant");
  }, [markRead]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--shell-topbar))] w-full max-w-4xl flex-col px-4 py-5 sm:px-6">
      <div className="panel sheen flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-flux-500/30 to-flux-600/10 text-flux-400">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-hi">Operations copilot</p>
            <p className="truncate text-[11.5px] text-lo">
              Reads the live floor. Will not decide for you.
            </p>
          </div>
        </header>

        <MessageList
          messages={messages}
          typing={typing}
          variant="document"
          agentName="Copilot"
          emptyState={
            <div className="max-w-sm text-center">
              <p className="text-[15px] text-hi">Ask it something you cannot eyeball</p>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-mid">
                It only knows what is on the board — the same numbers you can
                see. Its advantage is arithmetic under pressure, not information
                you do not have.
              </p>
            </div>
          }
        />

        {configured ? (
          <Composer
            placeholder={
              live
                ? "Ask about the queue, the maths, or a term you do not know…"
                : "The shift is over — the copilot has nothing live to read."
            }
            disabled={!live}
            suggestions={live ? ASSISTANT_SUGGESTIONS : []}
            onSend={(value) => void send("assistant", value)}
          />
        ) : (
          <div className="shrink-0 border-t border-line p-8">
            <ChatUnavailable what="The copilot" />
          </div>
        )}
      </div>

      <p className="mt-3 shrink-0 text-center text-[11.5px] text-faint">
        Every prompt you write is kept. How you direct the machine is part of the
        read.
      </p>
    </div>
  );
}
