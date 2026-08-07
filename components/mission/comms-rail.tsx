"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";

import { ChatUnavailable } from "@/components/chat/chat-unavailable";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { useIsShiftLive } from "@/hooks/use-mission";
import { AGENTS, AGENT_ORDER } from "@/lib/agents/personas";
import { NO_MESSAGES, countUnread, useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import type { AgentId } from "@/types/agents";

const ACCENT = {
  ion: "from-ion-500/30 to-ion-600/10 text-ion-400",
  flux: "from-flux-500/30 to-flux-600/10 text-flux-400",
  ember: "from-ember-500/30 to-ember-600/10 text-ember-400",
} as const;

/**
 * Communications, inline. Leaving the control room to answer a message means
 * losing sight of the queue, so the colleagues live in the left rail instead.
 */
export function CommsRail({
  configured,
  className,
}: {
  configured: boolean;
  className?: string;
}) {
  const [active, setActive] = React.useState<AgentId>("hub-manager");

  const threads = useChatStore((state) => state.threads);
  const lastReadAt = useChatStore((state) => state.lastReadAt);
  const typing = useChatStore((state) => state.typing);
  const send = useChatStore((state) => state.send);
  const markRead = useChatStore((state) => state.markRead);
  const live = useIsShiftLive();

  const persona = AGENTS[active];
  const messages = threads[active] ?? NO_MESSAGES;

  React.useEffect(() => {
    markRead(active);
  }, [active, markRead, messages.length]);

  return (
    <section
      className={cn("panel sheen flex min-h-0 flex-col overflow-hidden", className)}
      aria-label="Communications"
    >
      <header className="shrink-0 border-b border-line px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-3.5 text-ember-500" />
          <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
            Communications
          </span>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          {AGENT_ORDER.map((agentId) => {
            const agent = AGENTS[agentId];
            const unread = countUnread(threads[agentId], lastReadAt[agentId]);
            const isActive = agentId === active;
            return (
              <button
                key={agentId}
                type="button"
                onClick={() => setActive(agentId)}
                className={cn(
                  "relative flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5",
                  "transition-colors duration-150",
                  isActive
                    ? "border-line-strong bg-white/[0.06]"
                    : "border-transparent hover:bg-white/[0.03]",
                )}
                aria-pressed={isActive}
              >
                <span className="relative shrink-0">
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full bg-linear-to-br text-[9.5px] font-semibold",
                      ACCENT[agent.accent],
                    )}
                  >
                    {agent.monogram}
                  </span>
                  <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-ion-500 ring-2 ring-surface" />
                </span>
                <span
                  className={cn(
                    "hidden truncate text-[11.5px] sm:block",
                    isActive ? "text-hi" : "text-lo",
                  )}
                >
                  {agent.name.split(" ")[0]}
                </span>
                {unread > 0 ? (
                  <span
                    data-readout
                    className="ml-auto grid h-3.5 min-w-3.5 shrink-0 place-items-center rounded-full bg-ember-500 px-1 text-[9px] font-semibold text-white tabular-nums"
                  >
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <MessageList
        messages={messages}
        typing={Boolean(typing[active])}
        variant="bubbles"
        agentName={persona.name.split(" ")[0] ?? persona.name}
        monogram={persona.monogram}
        accentClass={ACCENT[persona.accent]}
        showSeen
        emptyState={
          <p className="text-center text-[12.5px] leading-relaxed text-lo">
            {persona.blurb}
          </p>
        }
      />

      {configured ? (
        <Composer
          placeholder={
            live ? `Message ${persona.name.split(" ")[0]}…` : "The shift is over."
          }
          disabled={!live}
          suggestions={live ? persona.suggestions.slice(0, 2) : []}
          onSend={(value) => void send(active, value)}
        />
      ) : (
        <div className="shrink-0 border-t border-line p-5">
          <ChatUnavailable what="Messages" />
        </div>
      )}
    </section>
  );
}
