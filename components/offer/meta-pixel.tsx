"use client";

import Script from "next/script";

import { OFFER } from "@/lib/constants/offer";

/**
 * Meta Pixel for the challenge landing page — off until it is configured.
 *
 * Set `NEXT_PUBLIC_META_PIXEL_ID` and the page reports PageView and
 * ViewContent on load, InitiateCheckout when someone heads to payment and
 * Contact when they open WhatsApp. Without the variable nothing loads and
 * `track` is a no-op, so the page behaves identically either way.
 */

const RAW_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
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

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  fbq("track", event, params);
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;
  const content = JSON.stringify({
    content_name: OFFER.name,
    value: OFFER.price,
    currency: OFFER.currency,
  });
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');
fbq('track','ViewContent',${content});`,
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
    </>
  );
}
