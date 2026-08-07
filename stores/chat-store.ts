"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AGENTS, AGENT_ORDER } from "@/lib/agents/personas";
import { useMissionStore } from "@/stores/mission-store";
import type { AgentId, ChatMessage } from "@/types/agents";

export type ThreadId = AgentId | "assistant";

interface ChatState {
  threads: Record<string, ChatMessage[]>;
  /** Elapsed mission seconds at which the operator last opened each thread. */
  lastReadAt: Record<string, number>;
  typing: Record<string, boolean>;

  seedOpeners: () => void;
  send: (target: ThreadId, content: string) => Promise<void>;
  markRead: (target: ThreadId) => void;
  reset: () => void;
}

function messageId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function elapsed(): number {
  return useMissionStore.getState().world?.elapsed ?? 0;
}

const emptyThreads: Record<string, ChatMessage[]> = {};

/**
 * Stable empty array. A selector that returns a fresh `[]` gives zustand a new
 * snapshot on every read, which React treats as an endless update.
 */
export const NO_MESSAGES: ChatMessage[] = [];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      threads: emptyThreads,
      lastReadAt: {},
      typing: {},

      /** Colleagues open the conversation, not the operator. */
      seedOpeners: () => {
        const { threads } = get();
        const next = { ...threads };
        let changed = false;

        for (const agentId of AGENT_ORDER) {
          if (next[agentId]?.length) continue;
          const persona = AGENTS[agentId];
          next[agentId] = persona.openers.map((line, index) => ({
            id: `${agentId}-opener-${index}`,
            role: "agent" as const,
            content: line,
            at: 0,
          }));
          changed = true;
        }

        if (changed) set({ threads: next });
      },

      markRead: (target) =>
        set((state) => ({ lastReadAt: { ...state.lastReadAt, [target]: elapsed() } })),

      send: async (target, content) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const world = useMissionStore.getState().world;
        const outgoing: ChatMessage = {
          id: messageId(),
          role: "operator",
          content: trimmed,
          at: elapsed(),
        };

        const replyId = messageId();
        const reply: ChatMessage = {
          id: replyId,
          role: "agent",
          content: "",
          at: elapsed(),
          pending: true,
        };

        set((state) => ({
          threads: {
            ...state.threads,
            [target]: [...(state.threads[target] ?? []), outgoing, reply],
          },
          typing: { ...state.typing, [target]: true },
        }));

        const history = (get().threads[target] ?? [])
          .filter((message) => !message.pending && !message.error)
          .map((message) => ({ role: message.role, content: message.content }));

        const patchReply = (patch: Partial<ChatMessage>) =>
          set((state) => ({
            threads: {
              ...state.threads,
              [target]: (state.threads[target] ?? []).map((message) =>
                message.id === replyId ? { ...message, ...patch } : message,
              ),
            },
          }));

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, messages: history, world }),
          });

          if (!response.ok || !response.body) {
            const payload = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            patchReply({
              pending: false,
              error: payload?.error ?? "No reply came back.",
              content: "",
            });
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let firstChunk = true;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            if (firstChunk) {
              firstChunk = false;
              set((state) => ({ typing: { ...state.typing, [target]: false } }));
            }
            patchReply({ content: buffer });
          }

          patchReply({ content: buffer, pending: false, at: elapsed() });
        } catch (error) {
          patchReply({
            pending: false,
            content: "",
            error: error instanceof Error ? error.message : "The message did not send.",
          });
        } finally {
          set((state) => ({ typing: { ...state.typing, [target]: false } }));
        }
      },

      reset: () => set({ threads: emptyThreads, lastReadAt: {}, typing: {} }),
    }),
    {
      name: "of.chat",
      version: 1,
      // `typing` is transient — a reload should never restore a typing dot.
      partialize: (state) => ({
        threads: state.threads,
        lastReadAt: state.lastReadAt,
      }),
    },
  ),
);

/**
 * Agent messages that arrived after the operator last opened the thread.
 * Takes plain values rather than the store so callers can memoise it — a
 * selector that returns a new function re-renders on every store write.
 */
export function countUnread(
  messages: ChatMessage[] | undefined,
  lastReadAt: number | undefined,
): number {
  const since = lastReadAt ?? -1;
  return (messages ?? []).filter(
    (message) => message.role === "agent" && message.at > since && !message.pending,
  ).length;
}
