"use client";

import * as React from "react";

import { MISSION_DURATION_SECONDS, missionTimeScale } from "@/lib/mission/config";
import { useMissionStore } from "@/stores/mission-store";

/**
 * True once zustand has rehydrated from storage. Everything mission-aware must
 * wait for this or the server's "briefing" render will fight the client's
 * "live" one.
 */
export function useMissionHydrated(): boolean {
  // Always false on the first render, on both sides, so the server and client
  // agree. Resolving it in an effect is what makes that safe.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // zustand only attaches `persist` when a storage backend exists. There is
    // none during SSR, so this must never be assumed present.
    const persist = useMissionStore.persist as
      | typeof useMissionStore.persist
      | undefined;

    if (!persist) {
      setHydrated(true);
      return;
    }

    if (persist.hasHydrated()) setHydrated(true);
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

/**
 * Drives the world. Mounted once, in the app shell — the floor keeps moving
 * whichever panel the operator is looking at.
 */
export function useMissionTick(): void {
  const tick = useMissionStore((state) => state.tick);
  const status = useMissionStore((state) => state.status);

  React.useEffect(() => {
    if (status !== "live") return;

    tick();
    const interval = window.setInterval(tick, 1000 / Math.min(4, missionTimeScale()));

    // Catching up after a background tab is the same code path as a refresh.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick, status]);
}

/**
 * Whether the operator can still change anything. The floor panels stay
 * readable after handover, but every control on them has to go quiet — a button
 * that silently does nothing is worse than no button.
 */
export function useIsShiftLive(): boolean {
  const hydrated = useMissionHydrated();
  const status = useMissionStore((state) => state.status);
  return hydrated && status === "live";
}

/** Seconds left on the shift, floored at zero. */
export function useMissionRemaining(): number {
  const elapsed = useMissionStore((state) => state.world?.elapsed ?? 0);
  return Math.max(0, MISSION_DURATION_SECONDS - elapsed);
}

export function useMissionProgress(): number {
  const elapsed = useMissionStore((state) => state.world?.elapsed ?? 0);
  return Math.min(1, elapsed / MISSION_DURATION_SECONDS);
}
