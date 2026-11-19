/**
 * The one conversion event on /operator-bootcamp: `apply_click`, with the
 * section the click came from.
 *
 * Sent through whatever is on the page: the site-wide Meta Pixel (as a custom
 * event, so it never touches the ads' standard conversion events), and Google
 * tags if gtag or a dataLayer is present. With none of them it does nothing.
 */

type Params = { location: string };

interface TrackingWindow {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

export function trackApplyClick(location: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as TrackingWindow;
  const params: Params = { location };
  try {
    if (typeof w.fbq === "function") w.fbq("trackCustom", "apply_click", params);
    if (typeof w.gtag === "function") w.gtag("event", "apply_click", params);
    else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: "apply_click", ...params });
  } catch {
    // Analytics must never break a click.
  }
}
