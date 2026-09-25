import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Mail, MessageCircle } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { LightCanvas, WhatsAppButton } from "@/components/offer/offer-client";
import { PurchaseEvent } from "@/components/offer/purchase-event";
import { LEGAL_LINKS } from "@/lib/constants/legal";
import { OFFER, OFFER_DAYS, OFFER_ROUTE, inr, mailtoUrl } from "@/lib/constants/offer";
import { verifyPayment } from "@/lib/offer/payment-status";

/**
 * Where Razorpay returns after payment.
 *
 * Purchase is only reported once the payment id in the return URL matches a
 * payment the signed webhook recorded — never on the strength of a URL. When
 * the webhook has not landed yet, the page says the seat is being confirmed
 * rather than claiming a sale that may not exist.
 */

export const metadata: Metadata = {
  title: "You're in",
  description: `Your seat for the ${OFFER.name} is confirmed.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#FAF7F0", colorScheme: "light" };

export const dynamic = "force-dynamic";

const NEXT_STEPS = [
  {
    icon: Mail,
    title: "Watch your inbox",
    body: "Your challenge access goes to the email you registered with. Check spam once, and mark it as not spam so the daily emails arrive.",
  },
  {
    icon: CalendarDays,
    title: `Day 1 opens ${OFFER.liveLabel}`,
    body: `Sign in with the same email and the first simulation is waiting. One new day opens each morning until ${OFFER_DAYS[6]?.date}.`,
  },
  {
    icon: Clock,
    title: "Keep 15 minutes free a day",
    body: "Days 1 to 5 take about fifteen minutes each. Day 6 is your Operator Profile, and Day 7 is the live AMA.",
  },
];

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ razorpay_payment_id?: string; payment_id?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.razorpay_payment_id ?? params.payment_id;
  const status = await verifyPayment(paymentId);

  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      {status.paid && paymentId ? (
        <PurchaseEvent
          eventId={`purchase_${paymentId}`}
          value={status.amount ?? OFFER.price}
          currency={status.currency ?? OFFER.currency}
          contentName={OFFER.name}
        />
      ) : null}

      <header className="border-b border-black/[0.06] bg-[#FAF7F0]/85">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5 sm:px-6">
          <Link href="/" aria-label="Operator Forge home" className="flex items-center gap-2.5 rounded-xl">
            <span className="grid size-9 place-items-center rounded-xl bg-[#0B0B0B]">
              <LogoMark className="size-7" />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Operator Forge</span>
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 pt-10 pb-20 sm:px-6 lg:pt-14">
        {status.paid ? (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-[#128C7E] text-white">
              <CheckCircle2 className="size-7" aria-hidden />
            </span>
            <h1 className="mt-5 text-[clamp(2.1rem,6vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em] text-balance">
              You&rsquo;re in. Your seat is confirmed.
            </h1>
            <p className="mt-4 text-[16.5px] leading-relaxed text-[#3D3D3D]">
              Payment of {inr(status.amount ?? OFFER.price)} received for the {OFFER.name}. The cohort runs{" "}
              <strong className="font-semibold text-[#0B0B0B]">{OFFER.dateLabel}</strong>.
            </p>
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-ember-500 text-[#0B0B0B]">
              <Clock className="size-7" aria-hidden />
            </span>
            <h1 className="mt-5 text-[clamp(2.1rem,6vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em] text-balance">
              Thanks — we&rsquo;re confirming your payment.
            </h1>
            <p className="mt-4 text-[16.5px] leading-relaxed text-[#3D3D3D]">
              Payments are usually confirmed within a minute or two. Refresh this page shortly, or message us with
              your payment ID and we&rsquo;ll check it for you. If money left your account, your seat is safe.
            </p>
          </>
        )}

        <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-6 sm:p-8">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">What happens next</h2>
          <ol className="mt-5 space-y-5">
            {NEXT_STEPS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F1ECE1] text-[#0B0B0B]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[15.5px] font-bold tracking-[-0.01em]">{title}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[#3D3D3D]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#0B0B0B] p-6 text-white sm:p-8">
          <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em]">
            <MessageCircle className="size-5 text-ember-500" aria-hidden />
            Questions before Day 1?
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">
            Message us on WhatsApp at {OFFER.whatsapp.display} — a person reads every message — or email{" "}
            <a href={mailtoUrl("7-Day Challenge — I've registered")} className="font-medium text-ember-500 underline underline-offset-4">
              {OFFER.email}
            </a>
            .
          </p>
          <WhatsAppButton
            label="Message us on WhatsApp"
            className="mt-5 w-full sm:w-auto"
          />
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[#6B6B6B]">
          <Link href={OFFER_ROUTE} className="underline underline-offset-4 hover:text-[#0B0B0B]">
            Back to the challenge page
          </Link>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="underline underline-offset-4 hover:text-[#0B0B0B]">
              {link.label}
            </Link>
          ))}
        </p>
      </main>
    </div>
  );
}
