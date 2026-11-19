"use client";

import * as React from "react";

/** Once per page load, even though development mode runs effects twice. */
let warned = false;

/** In development only: one console warning listing every [placeholder] still unfilled. */
export function PlaceholderWarning({ heading, items }: { heading: string; items: string[] }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" || items.length === 0 || warned) return;
    warned = true;
    console.warn(`${heading}\n${items.map((item) => `  • ${item}`).join("\n")}`);
  }, [heading, items]);
  return null;
}
