"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { ChatUnavailable } from "@/components/chat/chat-unavailable";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { useChatAvailability } from "@/hooks/use-chat-availability";
import { useIsShiftLive } from "@/hooks/use-mission";
import { AGENTS, AGENT_ORDER } from "@/lib/agents/personas";
import { easing } from "@/lib/motion";
import { NO_MESSAGES, countUnread, useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import type { AgentId } from "@/types/agents";

const ACCENT = {
  ion: "from-ion-500/30 to-ion-600/10 text-ion-400",
  flux: "from-flux-500/30 to-flux-600/10 text-flux-400",
  ember: "from-ember-500/30 to-ember-600/10 text-ember-400",
} as const;

export function MessagesPanel({ configured: initial }: { configured: boolean }) {
  const configured = useChatAvailability(initial);
  const [active, setActive] = React.useState<AgentId>("hub-manager");
  const [mobileThread, setMobileThread] = React.useState(false);

  const threads = useChatStore((state) => state.threads);
  const lastReadAt = useChatStore((state) => state.lastReadAt);
  const typing = useChatStore((state) => state.typing);
  const send = useChatStore((state) => state.send);
  const markRead = useChatStore((state) => state.markRead);
  const live = useIsShiftLive();

  // Derived locally: a selector returning a fresh function would re-render forever.
  const unread = React.useCallback(
    (agentId: AgentId) => countUnread(threads[agentId], lastReadAt[agentId]),
    [threads, lastReadAt],
  );

  const persona = AGENTS[active];
  const messages = threads[active] ?? NO_MESSAGES;

  React.useEffect(() => {
    markRead(active);
  }, [active, markRead, messages.length]);

  function open(agentId: AgentId) {
    setActive(agentId);
    setMobileThread(true);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--shell-topbar))] w-full max-w-6xl flex-col px-4 py-5 sm:px-6">
      <div className="panel sheen flex min-h-0 flex-1 overflow-hidden">
        {/* ── Threads ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "w-full shrink-0 flex-col border-r border-line md:flex md:w-72",
            mobileThread ? "hidden" : "flex",
          )}
        >
          <header className="border-b border-line px-4 py-3.5">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
              Threads
            </p>
          </header>

          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {AGENT_ORDER.map((agentId) => {
              const agent = AGENTS[agentId];
              const thread = threads[agentId] ?? [];
              const last = thread[thread.length - 1];
              const count = unread(agentId);
              const isActive = agentId === active;

              return (
                <li key={agentId}>
                  <button
                    type="button"
                    onClick={() => open(agentId)}
                    className={cn(
                      "relative flex w-full items-start gap-3 rounded-xl p-3 text-left",
                      "transition-colors duration-150",
                      isActive ? "text-hi" : "text-mid hover:bg-white/[0.03]",
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="thread-active"
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                        className="absolute inset-0 -z-10 rounded-xl border border-line-strong bg-white/[0.055]"
                      />
                    ) : null}

                    <span className="relative shrink-0">
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-full bg-linear-to-br text-[12px] font-semibold",
                          ACCENT[agent.accent],
                        )}
                      >
                        {agent.monogram}
                      </span>
                      <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ion-500 ring-2 ring-surface" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium">
                          {agent.name}
                        </span>
                        {count > 0 ? (
                          <span
                            data-readout
                            className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-semibold text-white tabular-nums"
                          >
                            {count}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-lo">
                        {agent.role}
                      </span>
                      <span className="mt-1 block truncate text-[12px] text-faint">
                        {last ? last.content.slice(0, 60) : agent.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ── Conversation ────────────────────────────────────────────── */}
        <section
          className={cn(
            "min-w-0 flex-1 flex-col md:flex",
            mobileThread ? "flex" : "hidden",
          )}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileThread(false)}
              className="-ml-1.5 grid size-8 place-items-center rounded-lg text-lo hover:bg-white/[0.06] hover:text-hi md:hidden"
              aria-label="Back to threads"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="relative shrink-0">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full bg-linear-to-br text-[12px] font-semibold",
                  ACCENT[persona.accent],
                )}
              >
                {persona.monogram}
              </span>
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ion-500 ring-2 ring-surface" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-hi">{persona.name}</p>
              <p className="truncate text-[11.5px] text-ion-400">
                Online · {persona.role}
              </p>
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
          />

          {configured ? (
            <Composer
              placeholder={
                live
                  ? `Message ${persona.name.split(" ")[0]}…`
                  : "The shift is over — everyone has gone home."
              }
              disabled={!live}
              suggestions={live ? persona.suggestions : []}
              onSend={(value) => void send(active, value)}
            />
          ) : (
            <div className="shrink-0 border-t border-line p-8">
              <ChatUnavailable what="Messages" />
            </div>
          )}
        </section>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: easing.outExpo }}
        className="mt-3 shrink-0 text-center text-[11.5px] text-faint"
      >
        Every message is part of your record. How you ask is read as closely as
        what you decide.
      </motion.p>
    </div>
  );
}
