"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Meta Pixel, site-wide.
 *
 * Loaded once from the root layout: PageView on the first load and on every
 * client-side navigation after it. The landing page adds ViewContent, and its
 * form and WhatsApp buttons send Lead, InitiateCheckout and Contact through
 * `track`. `NEXT_PUBLIC_META_PIXEL_ID` overrides the id; set it to `off` to
 * turn the pixel off entirely.
 */

const DEFAULT_PIXEL_ID = "1549391803656128";
const RAW_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? DEFAULT_PIXEL_ID).trim();
// The id is written into an inline script, so only digits are ever accepted.
const PIXEL_ID = /^\d{5,20}$/.test(RAW_ID) ? RAW_ID : null;

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function pixelReady(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

const RETRY_MS = 250;
const MAX_TRIES = 20;

/**
 * Sends a standard event. The pixel script loads after the page becomes
 * interactive, so an event fired before then waits for it briefly rather
 * than being dropped.
 */
export function track(event: string, params?: Record<string, unknown>, tries = 0): void {
  if (typeof window === "undefined" || !PIXEL_ID) return;
  const fbq = window.fbq;
  if (typeof fbq === "function") {
    fbq("track", event, params);
    return;
  }
  if (tries < MAX_TRIES) window.setTimeout(() => track(event, params, tries + 1), RETRY_MS);
}

/** PageView for client-side navigations; the base code covers the first load. */
function PageViews() {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track("PageView");
  }, [pathname]);
  return null;
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
      <PageViews />
    </>
  );
}

/** Fires one event when the page that renders it mounts. */
export function MetaPixelEvent({ event, params }: { event: string; params?: Record<string, unknown> }) {
  const sent = React.useRef(false);
  React.useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, params);
  }, [event, params]);
  return null;
}
