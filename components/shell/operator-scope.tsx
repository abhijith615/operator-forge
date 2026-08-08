"use client";

import * as React from "react";

import { useChatStore } from "@/stores/chat-store";
import { useHistoryStore } from "@/stores/history-store";
import { useMissionStore } from "@/stores/mission-store";
import { useShellStore } from "@/stores/shell-store";
import { useTelemetryStore } from "@/stores/telemetry-store";

/** Whose data the persisted stores currently hold. */
const OPERATOR_KEY = "of.operator";

/**
 * `useLayoutEffect` warns when it runs on the server, and this component is
 * rendered inside a server layout.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
 * Wipes every persisted store and forgets who they belonged to.
 *
 * Called on the way out, because signing out is the moment a shared machine
 * changes hands. Without this the transcripts sit in localStorage until the
 * next person happens to sign in — readable from devtools by whoever sits
 * down in between. `signOut` is a server action and cannot reach browser
 * storage, so this has to run on the client first.
 */
export function clearOperatorScope(): void {
  useMissionStore.getState().reset();
  useChatStore.getState().reset();
  useTelemetryStore.getState().reset();
  useHistoryStore.getState().clear();
  useShellStore.getState().setWalkthroughSeen(false);

  try {
    window.localStorage.removeItem(OPERATOR_KEY);
  } catch {
    /* Storage unavailable — the resets above are what matter. */
  }
}

/**
 * Binds the persisted stores to one operator.
 *
 * Every store keeps its own fixed localStorage key — `of.mission`, `of.chat`,
 * `of.telemetry`, `of.history` — none of which say whose they are. On a shared
 * machine that meant the next person to sign in inherited the last person's
 * shift, their conversations with the three colleagues, and their telemetry.
 * The rows in Supabase were always scoped correctly; this is purely what the
 * browser was holding on to.
 *
 * Resetting through the store actions rather than deleting the keys directly
 * keeps the in-memory copies honest — zustand hydrates at module load, so a
 * key removed behind its back would simply be written out again on the next
 * change, with the old operator's data still in it.
 *
 * Runs before paint so the previous operator's numbers never reach the screen.
 */
export function OperatorScope({ operatorId }: { operatorId: string }) {
  useIsomorphicLayoutEffect(() => {
    let previous: string | null = null;
    try {
      previous = window.localStorage.getItem(OPERATOR_KEY);
    } catch {
      // Storage unavailable (private mode, blocked cookies). Nothing is being
      // persisted either, so there is nothing to leak.
      return;
    }

    if (previous === operatorId) return;

    try {
      window.localStorage.setItem(OPERATOR_KEY, operatorId);
    } catch {
      /* Best effort — the resets below still run. */
    }

    useMissionStore.getState().reset();
    useChatStore.getState().reset();
    useTelemetryStore.getState().reset();
    useHistoryStore.getState().clear();
    // A new operator has not seen the walkthrough, whatever this browser
    // remembers. Sidebar and sound stay put: those are device preferences,
    // not a record of anybody.
    useShellStore.getState().setWalkthroughSeen(false);
  }, [operatorId]);

  return null;
}
