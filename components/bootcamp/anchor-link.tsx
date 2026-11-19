"use client";

import * as React from "react";

/**
 * An in-page link that scrolls smoothly to its section. The section's own
 * scroll-margin keeps the heading clear of the sticky header; reduced motion
 * jumps instead of gliding.
 */
export function AnchorLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const go = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
    if (!target) return;
    event.preventDefault();
    onNavigate?.();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    // Move focus with the view, for keyboard and screen reader users.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  return (
    <a href={href} onClick={go} className={className}>
      {children}
    </a>
  );
}
