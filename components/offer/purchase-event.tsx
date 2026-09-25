"use client";

import * as React from "react";

import { track } from "@/components/offer/meta-pixel";

/**
 * Reports a Purchase once, from the browser, using the same id the webhook
 * sends to the Conversions API — Meta keeps one of the two. Rendered only
 * after the payment has been verified server-side.
 */
export function PurchaseEvent({
  eventId,
  value,
  currency,
  contentName,
}: {
  eventId: string;
  value: number;
  currency: string;
  contentName: string;
}) {
  const sent = React.useRef(false);

  React.useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("Purchase", { value, currency, content_name: contentName }, eventId);
  }, [eventId, value, currency, contentName]);

  return null;
}
