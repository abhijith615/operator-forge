"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageSquare, X } from "lucide-react";

import { AGENTS } from "@/lib/agents/personas";
import { easing } from "@/lib/motion";
import { playNotificationSound } from "@/lib/sound";
import { useChatStore } from "@/stores/chat-store";
import { useShellStore } from "@/stores/shell-store";
import type { ChatMessage } from "@/types/agents";
import { cn } from "@/lib/utils";

const DWELL_MS = 9_000;

interface Popped {
  id: string;
  thread: string;
  from: string;
  text: string;
}

/**
 * Somebody said something.
 *
 * The control room used to carry a third column for conversation, which
 * duplicated the Messages tab in the sidebar and cost the floor a fifth of the
 * screen to do it. With the column gone, a message that arrives while the
 * operator is looking at the queue has to find them — so it interrupts, the
 * way a message does, and links to the thread it came from.
 *
 * It never fires for messages the operator is already looking at: a popup
 * announcing the reply on screen in front of you is noise.
 */
export function MessageToasts() {
  const threads = useChatStore((state) => state.threads);
  const soundEnabled = useShellStore((state) => state.soundEnabled);
  const pathname = usePathname();
  const onMessages = pathname?.startsWith("/messages") ?? false;

  const [shown, setShown] = React.useState<Popped[]>([]);
  /**
   * Everything already delivered. Seeded on the first pass rather than left
   * empty, or opening the shift would fire a toast for every opener a
   * colleague had already sent.
   */
  const delivered = React.useRef<Set<string> | null>(null);

  React.useEffect(() => {
    const seen = delivered.current;

    const incoming: Popped[] = [];
    for (const [thread, messages] of Object.entries(threads)) {
      for (const message of messages as ChatMessage[]) {
        if (message.role === "operator") continue;
        if (seen?.has(message.id)) continue;
        if (!seen) continue;
        incoming.push({
          id: message.id,
          thread,
          from: AGENTS[thread as keyof typeof AGENTS]?.name ?? "Assistant",
          text: message.content,
        });
      }
    }

    if (!seen) {
      // First pass: remember what is already there and announce none of it.
      delivered.current = new Set(
        Object.values(threads).flatMap((messages) => (messages as ChatMessage[]).map((m) => m.id)),
      );
      return;
    }

    if (incoming.length === 0) return;
    for (const message of incoming) seen.add(message.id);
    if (onMessages) return;

    setShown((current) => [...current, ...incoming].slice(-3));
    if (soundEnabled) playNotificationSound();
  }, [threads, onMessages, soundEnabled]);

  const drop = React.useCallback((id: string) => {
    setShown((current) => current.filter((entry) => entry.id !== id));
  }, []);

  React.useEffect(() => {
    if (shown.length === 0) return;
    const timers = shown.map((entry) =>
      window.setTimeout(() => drop(entry.id), DWELL_MS),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [shown, drop]);

  if (shown.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {shown.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
            transition={{ duration: 0.3, ease: easing.outExpo }}
            className={cn(
              "pointer-events-auto rounded-card border border-flux-500/35 bg-obsidian/95 p-3.5",
              "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl",
            )}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 shrink-0 text-flux-400" aria-hidden />
              <p className="text-[12.5px] font-semibold text-hi">{entry.from}</p>
              <button
                type="button"
                onClick={() => drop(entry.id)}
                aria-label="Dismiss"
                className="-m-1 ml-auto rounded p-1 text-faint transition-colors hover:text-hi focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>

            <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-mid">
              {entry.text}
            </p>

            <Link
              href={`/messages?thread=${entry.thread}`}
              onClick={() => drop(entry.id)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ember-400 transition-colors hover:text-ember-200 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:outline-none"
            >
              Open the thread
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
