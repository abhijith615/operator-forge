"use client";

import * as React from "react";
import { ArrowRight, MessageCircle } from "lucide-react";

import { pixelReady, track } from "@/components/offer/meta-pixel";
import { buttonVariants } from "@/components/ui/button";
import { OFFER, OFFER_DAYS, inr, whatsappUrl } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

/**
 * The few pieces of the landing page that need the browser: the live cohort
 * status, the tracked checkout link, the sticky mobile bar and the WhatsApp
 * shortcut. Everything else on the page is static, which keeps an ad click
 * fast on a phone.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type CohortStatus =
  | { kind: "upcoming"; days: number; hours: number }
  | { kind: "live"; day: number }
  | { kind: "ended" };

function statusAt(now: number): CohortStatus {
  const start = Date.parse(OFFER.startsAt);
  const end = Date.parse(OFFER.endsAt);
  if (now < start) {
    const left = start - now;
    return {
      kind: "upcoming",
      days: Math.floor(left / DAY_MS),
      hours: Math.floor((left % DAY_MS) / HOUR_MS),
    };
  }
  if (now <= end) {
    return { kind: "live", day: Math.min(7, Math.floor((now - start) / DAY_MS) + 1) };
  }
  return { kind: "ended" };
}

/** Null on the server and on first paint, so the static HTML never disagrees with the browser. */
function useCohortStatus(): CohortStatus | null {
  const [status, setStatus] = React.useState<CohortStatus | null>(null);
  React.useEffect(() => {
    const tick = () => setStatus(statusAt(Date.now()));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return status;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "Starts in 12 days" — a real countdown to a real date, never invented scarcity. */
export function CohortBadge({ className }: { className?: string }) {
  const status = useCohortStatus();
  let label = `Starts ${OFFER_DAYS[0]?.date ?? ""}`;
  let live = false;
  if (status?.kind === "upcoming") {
    label =
      status.days >= 1
        ? `Starts in ${plural(status.days, "day")}`
        : status.hours >= 1
          ? `Starts in ${plural(status.hours, "hour")}`
          : "Starts within the hour";
  } else if (status?.kind === "live") {
    label = `Live now · Day ${status.day} of 7`;
    live = true;
  } else if (status?.kind === "ended") {
    label = "This cohort has ended";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium",
        status?.kind === "ended"
          ? "border-black/15 bg-white text-[#3D3D3D]"
          : "border-ember-600/40 bg-ember-500/20 text-[#0B0B0B]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          live ? "animate-pulse bg-[#0B0B0B]" : status?.kind === "ended" ? "bg-black/30" : "bg-ember-600",
        )}
      />
      {label}
    </span>
  );
}

/**
 * Follows a link after giving the pixel a moment to send, but only when the
 * pixel is actually there and the click is an ordinary one — a new-tab click
 * is never intercepted.
 */
function followAfterTracking(event: React.MouseEvent<HTMLAnchorElement>, url: string, fire: () => void) {
  const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  if (!pixelReady() || modified) {
    fire();
    return;
  }
  event.preventDefault();
  fire();
  window.setTimeout(() => {
    window.location.href = url;
  }, 180);
}

export function CheckoutButton({
  children,
  location,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  location: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const status = useCohortStatus();
  const classes = cn(
    buttonVariants({ variant: "primary", size }),
    "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none",
    className,
  );

  // Once the cohort is over, the honest next step is a conversation, not a payment.
  if (status?.kind === "ended") {
    const url = whatsappUrl("Hi Operator Forge, when does the next 7-Day Operations Leader Challenge start?");
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("Contact", { channel: "whatsapp", location })}
        className={classes}
      >
        Ask about the next cohort
        <ArrowRight />
      </a>
    );
  }

  return (
    <a
      href={OFFER.paymentUrl}
      onClick={(event) =>
        followAfterTracking(event, OFFER.paymentUrl, () =>
          track("InitiateCheckout", {
            value: OFFER.price,
            currency: OFFER.currency,
            content_name: OFFER.name,
            content_category: location,
          }),
        )
      }
      className={classes}
    >
      {children}
    </a>
  );
}

export function WhatsAppButton({
  compact = false,
  label = "Questions? WhatsApp us",
  className,
}: {
  compact?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("Contact", { channel: "whatsapp" })}
      aria-label={compact ? `WhatsApp us on ${OFFER.whatsapp.display}` : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white font-medium text-[#0B0B0B]",
        "transition-colors duration-150 hover:border-black/35",
        "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none",
        compact ? "size-10 sm:w-auto sm:px-4" : "h-12 px-6 text-[15px]",
        className,
      )}
    >
      <MessageCircle className="size-[18px] shrink-0 text-[#128C7E]" aria-hidden />
      <span className={compact ? "hidden text-[13px] sm:inline" : undefined}>
        {compact ? OFFER.whatsapp.display : label}
      </span>
    </a>
  );
}

/**
 * The price and the button, pinned to the bottom of a phone once the hero's
 * own button has scrolled away — and gone again when the closing call to
 * action is on screen, so there are never two at once.
 */
export function StickyJoinBar() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("final-cta");
    if (!hero) return;
    let past = false;
    let finalVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        if (entry.target === final) finalVisible = entry.isIntersecting;
      }
      setShow(past && !finalVisible);
    });
    observer.observe(hero);
    if (final) observer.observe(final);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#FAF7F0]/95 px-4 pt-3 backdrop-blur-md md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "transition-[transform,visibility] duration-300 ease-out",
        show ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <p className="text-[11.5px] leading-none text-[#6B6B6B] line-through">{inr(OFFER.listPrice)}</p>
          <p className="mt-1 text-[22px] leading-none font-bold tracking-[-0.02em] text-[#0B0B0B]">
            {inr(OFFER.price)}
          </p>
        </div>
        <CheckoutButton size="md" location="sticky-bar" className="flex-1">
          Join the challenge
          <ArrowRight />
        </CheckoutButton>
      </div>
    </div>
  );
}

export function FloatingWhatsApp() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("Contact", { channel: "whatsapp", location: "floating" })}
      aria-label={`Chat with us on WhatsApp, ${OFFER.whatsapp.display}`}
      // Larger screens only: on a phone it would sit over body text, and the
      // sticky header already carries a WhatsApp button there.
      className={cn(
        "fixed right-6 bottom-6 z-40 hidden size-14 place-items-center rounded-full bg-[#128C7E] text-white md:grid",
        "shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:scale-105",
        "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:outline-none",
      )}
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  );
}

/**
 * The site's root background is near-black. On this page that would show
 * through as a black band whenever a phone over-scrolls, so the canvas is
 * lightened for as long as the page is open and restored when it leaves.
 */
export function LightCanvas() {
  React.useEffect(() => {
    const { body, documentElement: html } = document;
    const previous = {
      body: body.style.backgroundColor,
      html: html.style.backgroundColor,
      scheme: html.style.colorScheme,
    };
    body.style.backgroundColor = "#FAF7F0";
    html.style.backgroundColor = "#FAF7F0";
    html.style.colorScheme = "light";
    return () => {
      body.style.backgroundColor = previous.body;
      html.style.backgroundColor = previous.html;
      html.style.colorScheme = previous.scheme;
    };
  }, []);
  return null;
}
