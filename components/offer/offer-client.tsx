"use client";

import * as React from "react";
import { ArrowRight, MessageCircle } from "lucide-react";

import { pixelCookie, track } from "@/components/offer/meta-pixel";
import { buttonVariants } from "@/components/ui/button";
import { OFFER, OFFER_DAYS, inr, whatsappUrl } from "@/lib/constants/offer";
import {
  ATTRIBUTION_KEYS,
  FORM_EVENT_ENDPOINT,
  HONEYPOT_FIELD,
  REGISTER_ENDPOINT,
  shapeOf,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationFields,
  type RegistrationResult,
} from "@/lib/offer/registration";
import { cn } from "@/lib/utils";

/**
 * The parts of the landing page that need the browser: the live cohort
 * status, the registration form, the "Register now" button that follows the
 * reader down the page, and the WhatsApp shortcuts. Everything else is static,
 * which keeps an ad click fast on a phone.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** How long payment waits on saving the registration before going anyway. */
const SAVE_TIMEOUT_MS = 6_000;

const FIELD_NAMES = ["name", "phone", "email"] as const;

function isAutofilled(input: HTMLInputElement | null): boolean {
  if (!input) return false;
  try {
    return input.matches(":autofill");
  } catch {
    try {
      return input.matches(":-webkit-autofill");
    } catch {
      return false;
    }
  }
}

/**
 * Tells us why a submission was refused, so problems that only happen on
 * someone else's phone can be found. Masked shapes only — never the values.
 */
function reportFormEvent(
  form: HTMLFormElement,
  kind: "invalid" | "request_failed",
  fields: readonly string[],
  error?: string,
) {
  try {
    const value = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? "";
    const body = JSON.stringify({
      kind,
      fields,
      detail: {
        phoneShape: shapeOf(value("phone")),
        emailShape: shapeOf(value("email")),
        nameLength: value("name").length,
        autofilled: FIELD_NAMES.filter((name) =>
          isAutofilled(form.querySelector<HTMLInputElement>(`[name="${name}"]`)),
        ),
        error,
      },
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.(FORM_EVENT_ENDPOINT, blob)) {
      void fetch(FORM_EVENT_ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Diagnostics must never get in the way.
  }
}

/**
 * Sends the registration and reads the answer. Anything other than a clear
 * answer — a network drop, an error page, a timeout — comes back as null,
 * which the form treats as "go to payment".
 */
async function sendRegistration(
  data: FormData,
  onFailure: (error: string) => void,
): Promise<RegistrationResult | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  try {
    const response = await fetch(REGISTER_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      onFailure(`http ${response.status}`);
      return null;
    }
    const result = (await response.json()) as RegistrationResult;
    if (result && typeof result.status === "string") return result;
    onFailure("unreadable response");
    return null;
  } catch (error) {
    console.error("[7-day-challenge] registration request failed", error);
    onFailure(error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none";

/* ── The cohort, as of now ────────────────────────────────────────────── */

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

/** "Starts in 12 days" — a countdown to the real start date. */
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

/* ── Register now ─────────────────────────────────────────────────────── */

const REGISTER_ANCHOR = "register";
const FIRST_FIELD = "register-name";

/**
 * Every call to action on the page leads to the one registration form. With a
 * mouse, the first field is focused on arrival; on a touch screen it is not,
 * because focusing would throw a keyboard up in the middle of the scroll.
 */
export function RegisterButton({
  children,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(REGISTER_ANCHOR);
    if (!target) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => document.getElementById(FIRST_FIELD)?.focus({ preventScroll: true }), reduced ? 0 : 450);
    }
  };
  return (
    <a
      href={`#${REGISTER_ANCHOR}`}
      onClick={onClick}
      className={cn(buttonVariants({ variant: "primary", size }), FOCUS_RING, className)}
    >
      {children}
    </a>
  );
}

/* ── The registration form ────────────────────────────────────────────── */

function Field({
  id,
  name,
  label,
  error,
  prefix,
  hint,
  ...input
}: {
  id: string;
  name: keyof RegistrationFields;
  label: string;
  error?: string;
  prefix?: string;
  hint?: string;
} & React.ComponentProps<"input">) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-[#0B0B0B]">
        {label}
      </label>
      <div
        className={cn(
          "mt-1.5 flex h-12 items-center overflow-hidden rounded-xl border bg-white transition-colors",
          "focus-within:ring-2 focus-within:ring-[#0B0B0B] focus-within:ring-offset-1",
          error ? "border-[#B42318]" : "border-black/15 hover:border-black/30",
        )}
      >
        {prefix ? (
          <span className="flex h-full items-center border-r border-black/10 bg-[#F1ECE1] px-3 text-[15px] font-medium text-[#3D3D3D]">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="h-full w-full min-w-0 bg-transparent px-3.5 text-[16px] text-[#0B0B0B] outline-none placeholder:text-[#9A9A9A]"
          {...input}
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-[12.5px] font-medium text-[#B42318]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] text-[#6B6B6B]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Name, phone and email, then payment.
 *
 * The page's script sends it and navigates itself, so a validation error
 * keeps what the person typed. The form also carries a plain `action`, so a
 * submit that lands before the script has loaded still reaches the server and
 * is redirected to payment.
 */
export function RegistrationForm() {
  const status = useCohortStatus();
  const [errors, setErrors] = React.useState<RegistrationErrors>({});
  const [message, setMessage] = React.useState<string | null>(null);
  const [attribution, setAttribution] = React.useState<Record<string, string>>({});
  const [saving, startTransition] = React.useTransition();
  const [leaving, setLeaving] = React.useState(false);
  const pending = saving || leaving;

  // Back from the payment page, the browser may restore this page as it was
  // left — mid-navigation. Give the button back.
  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Ad parameters from the landing URL travel with the registration.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Sent back here by a submit that happened before this script loaded.
    const outcome = params.get("form");
    if (outcome === "invalid") setMessage("Please check your details and try again.");
    else if (outcome === "closed") {
      setMessage("This cohort has finished. Message us on WhatsApp to hear about the next one.");
    }
    const found: Record<string, string> = {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 200);
    }
    setAttribution(found);
  }, []);

  if (status?.kind === "ended") {
    return (
      <div className="rounded-xl border border-black/10 bg-[#F1ECE1] p-4">
        <p className="text-[14px] leading-relaxed text-[#3D3D3D]">
          This cohort has finished. Message us to hear when the next one opens.
        </p>
        <WhatsAppButton label="Ask about the next cohort" className="mt-3 w-full" />
      </div>
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const checked = validateRegistration({
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
    });
    setMessage(null);
    if (!checked.ok) {
      setErrors(checked.errors);
      const failed = FIELD_NAMES.filter((key) => checked.errors[key]);
      reportFormEvent(form, "invalid", failed);
      const first = failed[0];
      if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});

    // Meta's click cookies travel with the registration, so the server can
    // report the same person when the payment is confirmed later.
    for (const name of ["_fbp", "_fbc"] as const) {
      const value = pixelCookie(name);
      if (value) data.set(name.slice(1), value);
    }

    startTransition(async () => {
      // Saving the registration must never stop someone paying: whatever goes
      // wrong sending it, go to payment regardless.
      const result = await sendRegistration(data, (error) => reportFormEvent(form, "request_failed", [], error));

      if (result?.status === "invalid") {
        setErrors(result.errors);
        reportFormEvent(form, "invalid", FIELD_NAMES.filter((key) => result.errors[key]), "server");
      }
      else if (result?.status === "closed") setMessage(result.message);
      else {
        // The registration is in: one Lead, sharing its id with the server's
        // copy, then InitiateCheckout as we hand over to Razorpay. Razorpay
        // hosts the checkout itself, so this is the last moment we can see.
        const money = { content_name: OFFER.name, value: OFFER.price, currency: OFFER.currency };
        track("Lead", money, result?.leadEventId);
        track("InitiateCheckout", money, result?.leadEventId ? `checkout_${result.leadEventId}` : undefined);

        // Stays "Taking you to payment…" while Razorpay loads.
        setLeaving(true);
        window.location.assign(result?.paymentUrl ?? OFFER.paymentUrl);
      }
    });
  };

  return (
    <form
      id="register-form"
      action={REGISTER_ENDPOINT}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="relative space-y-3.5"
    >
      {/* A field only bots fill in: off-screen, out of the tab order, and
          hidden from screen readers. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD} aria-hidden="true">
          Leave this empty
        </label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
        />
      </div>
      {Object.entries(attribution).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <Field
        id={FIRST_FIELD}
        name="name"
        label="Full name"
        autoComplete="name"
        placeholder="Your name"
        maxLength={80}
        required
        error={errors.name}
      />
      <Field
        id="register-phone"
        name="phone"
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="98765 43210"
        prefix="+91"
        maxLength={32}
        required
        error={errors.phone}
      />
      <Field
        id="register-email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        maxLength={254}
        required
        hint="We'll send your challenge access to this email."
        error={errors.email}
      />

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "primary", size: "lg" }), FOCUS_RING, "w-full")}
      >
        {pending ? (
          "Taking you to payment…"
        ) : (
          <>
            Register now · {inr(OFFER.price)}
            <ArrowRight />
          </>
        )}
      </button>

      {message ? (
        <p role="alert" className="text-[13px] font-medium text-[#B42318]">
          {message}
        </p>
      ) : null}

      <p className="text-[11.5px] leading-relaxed text-[#6B6B6B]">
        Next step: secure payment on Razorpay. We use these details only to confirm your seat and to contact you about
        the challenge.
      </p>
    </form>
  );
}

/* ── The button that follows you down the page ────────────────────────── */

/**
 * Price and "Register now", pinned for the whole scroll — full width at the
 * bottom of a phone, a floating capsule on larger screens. It steps aside only
 * while the form itself is on screen, where it would cover the fields it
 * points to.
 */
export function StickyRegisterBar() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const form = document.getElementById("register-form");
    if (!form) {
      setShow(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setShow(!entry?.isIntersecting), {
      rootMargin: "0px 0px -72px 0px",
    });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#FAF7F0]/95 px-4 pt-3 backdrop-blur-md",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:bottom-5 md:mx-auto md:w-fit md:rounded-full md:border md:bg-white/95 md:pt-2 md:pr-2 md:pb-2 md:pl-6",
        "md:shadow-[0_18px_44px_-20px_rgba(0,0,0,0.5)]",
        "transition-[transform,opacity,visibility] duration-300 ease-out",
        show ? "visible translate-y-0 opacity-100" : "invisible translate-y-[120%] opacity-0",
      )}
    >
      <div className="flex items-center gap-3 md:gap-6">
        <div className="shrink-0">
          <p className="flex items-baseline gap-1.5">
            <span className="sr-only">Regular price</span>
            <span className="text-[12px] text-[#6B6B6B] line-through">{inr(OFFER.listPrice)}</span>
            <span className="sr-only">Offer price</span>
            <span className="text-[22px] leading-none font-bold tracking-[-0.02em] text-[#0B0B0B]">
              {inr(OFFER.price)}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#8A5A00]">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-[#D97706]" />
            {OFFER.seatsNote}
          </p>
        </div>
        <RegisterButton size="md" className="flex-1 md:flex-none">
          Register now
          <ArrowRight />
        </RegisterButton>
      </div>
    </div>
  );
}

/* ── WhatsApp ─────────────────────────────────────────────────────────── */

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
        FOCUS_RING,
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
