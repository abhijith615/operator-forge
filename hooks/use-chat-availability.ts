"use client";

import * as React from "react";

/**
 * Whether chat is actually reachable, checked against the running server.
 *
 * The server component passes what it knew at render time, but that value can
 * be baked into a cached RSC payload — so a server that has since been given a
 * key (or restarted without one) would keep reporting the old answer. This asks
 * the live process on mount and corrects itself.
 */
export function useChatAvailability(initial: boolean): boolean {
  const [configured, setConfigured] = React.useState(initial);

  React.useEffect(() => {
    let cancelled = false;

    void fetch("/api/chat", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { configured?: boolean } | null) => {
        if (cancelled || typeof payload?.configured !== "boolean") return;
        setConfigured(payload.configured);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}
