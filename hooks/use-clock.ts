"use client";

import * as React from "react";

/**
 * Ticking wall clock. Starts as `null` so server and client agree on first
 * paint, then updates on an aligned second boundary.
 */
export function useClock(): Date | null {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}
