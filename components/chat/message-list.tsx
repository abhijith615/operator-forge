"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

import { Markdown } from "@/components/chat/markdown";
import { hubClock } from "@/lib/mission/config";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/agents";

interface MessageListProps {
  messages: ChatMessage[];
  typing: boolean;
  /** Colleague threads render bubbles; the copilot renders documents. */
  variant: "bubbles" | "document";
  agentName: string;
  monogram?: string;
  accentClass?: string;
  /** Elapsed seconds of the last operator message the agent has "seen". */
  showSeen?: boolean;
  emptyState?: React.ReactNode;
}

export function MessageList({
  messages,
  typing,
  variant,
  agentName,
  monogram,
  accentClass = "from-ember-500/30 to-ember-600/10 text-ember-400",
  showSeen = false,
  emptyState,
}: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pinned = React.useRef(true);

  // Only auto-scroll if the operator has not scrolled up to read something.
  const handleScroll = React.useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  }, []);

  React.useEffect(() => {
    if (!pinned.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const lastOperatorIndex = messages.reduce(
    (last, message, index) => (message.role === "operator" ? index : last),
    -1,
  );

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
    >
      {messages.length === 0 && emptyState ? (
        <div className="grid h-full place-items-center px-6">{emptyState}</div>
      ) : null}

      <ul className={cn("space-y-3", variant === "document" && "space-y-6")}>
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.li
              key={message.id}
              layout="position"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: easing.outExpo }}
              className={cn(
                "flex",
                variant === "bubbles" && message.role === "operator"
                  ? "justify-end"
                  : "justify-start",
              )}
            >
              {variant === "bubbles" ? (
                <Bubble
                  message={message}
                  monogram={monogram}
                  accentClass={accentClass}
                  seen={showSeen && index === lastOperatorIndex}
                />
              ) : (
                <Document message={message} agentName={agentName} />
              )}
            </motion.li>
          ))}
        </AnimatePresence>

        {typing ? (
          <motion.li
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white/[0.03] px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    delay: dot * 0.16,
                    ease: "easeInOut",
                  }}
                  className="size-1.5 rounded-full bg-lo"
                />
              ))}
              <span className="ml-2 text-[11.5px] text-faint">
                {agentName} is typing
              </span>
            </div>
          </motion.li>
        ) : null}
      </ul>

      <div ref={bottomRef} className="h-px" />
    </div>
  );
}

function Bubble({
  message,
  monogram,
  accentClass,
  seen,
}: {
  message: ChatMessage;
  monogram?: string;
  accentClass: string;
  seen: boolean;
}) {
  const mine = message.role === "operator";

  if (message.error) {
    return (
      <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-bl-md border border-alert-500/25 bg-alert-500/[0.06] px-3.5 py-2.5">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-alert-500" />
        <p className="text-[13px] leading-relaxed text-alert-500">{message.error}</p>
      </div>
    );
  }

  if (message.pending && !message.content) return null;

  return (
    <div className={cn("flex max-w-[85%] items-end gap-2", mine && "flex-row-reverse")}>
      {!mine ? (
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full bg-linear-to-br text-[9.5px] font-semibold",
            accentClass,
          )}
        >
          {monogram}
        </span>
      ) : null}

      <div className="min-w-0">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed",
            mine
              ? "rounded-br-md bg-ember-600/85 text-white"
              : "rounded-bl-md border border-line-strong bg-white/[0.05] text-hi",
          )}
        >
          {mine ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Markdown className="[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_*]:text-hi">
              {message.content}
            </Markdown>
          )}
        </div>

        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1",
            mine ? "justify-end" : "justify-start",
          )}
        >
          <span data-readout className="font-mono text-[10px] text-faint tabular-nums">
            {hubClock(message.at)}
          </span>
          {seen ? <span className="text-[10px] text-faint">· Seen</span> : null}
        </div>
      </div>
    </div>
  );
}

function Document({ message, agentName }: { message: ChatMessage; agentName: string }) {
  const mine = message.role === "operator";

  if (message.error) {
    return (
      <div className="flex w-full items-start gap-2.5 rounded-card border border-alert-500/25 bg-alert-500/[0.06] px-4 py-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-alert-500" />
        <p className="text-[13px] leading-relaxed text-alert-500">{message.error}</p>
      </div>
    );
  }

  if (message.pending && !message.content) return null;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-[10px] tracking-[0.14em] uppercase",
            mine ? "text-lo" : "text-flux-400",
          )}
        >
          {mine ? "You" : agentName}
        </span>
        <span data-readout className="font-mono text-[10px] text-faint tabular-nums">
          {hubClock(message.at)}
        </span>
      </div>

      {mine ? (
        <p className="rounded-card border border-line-strong bg-white/[0.04] px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap text-hi">
          {message.content}
        </p>
      ) : (
        <Markdown className="pl-0.5">{message.content}</Markdown>
      )}
    </div>
  );
}
