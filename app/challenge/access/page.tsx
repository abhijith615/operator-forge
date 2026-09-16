import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, LockKeyhole, MessageCircle } from "lucide-react";

import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import { Container, Section } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { getOperator } from "@/lib/auth/session";
import { readChallengeAccess } from "@/lib/challenge/access";
import { switchChallengeAccount } from "@/lib/challenge/access-actions";
import { OFFER, OFFER_ROUTE, inr, whatsappUrl } from "@/lib/constants/offer";
import { LOGIN_ROUTE, safeNext } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Challenge access",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const LIVE_NOTE = `Simulations will be LIVE on ${OFFER.liveLabel}.`;

/**
 * Where an operator lands when the challenge will not open for them yet.
 *
 * Three cases: paid but early (all set, come back on the start date), registered
 * but unpaid (the payment link), and no registration at all — most often a
 * different sign-in address, so switching account is offered as plainly as
 * registering.
 */
export default async function ChallengeAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next, "/challenge/day-1");

  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${encodeURIComponent(next)}`);
  // Let in after all — perhaps the payment was confirmed a moment ago.
  const status = await readChallengeAccess();
  if (status === "granted") redirect(next);

  const email = <span className="font-medium break-all text-hi">{operator.email}</span>;

  return (
    <>
      <LandingNav />
      <main id="main" className="relative overflow-x-clip">
        <Section className="pt-32 sm:pt-40">
          <Container className="max-w-xl">
            <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
              <span className="grid size-11 place-items-center rounded-full border border-ember-500/30 bg-ember-500/10 text-ember-400">
                {status === "upcoming" ? (
                  <CalendarClock className="size-5" aria-hidden />
                ) : (
                  <LockKeyhole className="size-5" aria-hidden />
                )}
              </span>

              {status === "upcoming" ? (
                <>
                  <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi text-balance">
                    {LIVE_NOTE}
                  </h1>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
                    You&rsquo;re registered and paid as {email} — you&rsquo;re all set for the{" "}
                    {OFFER.name}. Day 1 opens on {OFFER.liveLabel}; sign in with this email then
                    and it will be waiting for you.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                      <Link href="/challenge">
                        See what&rsquo;s coming
                        <ArrowRight />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-[12px] font-medium text-ember-400">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {LIVE_NOTE}
                  </p>

                  <h1 className="mt-4 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi text-balance">
                    {status === "unpaid"
                      ? "We haven’t confirmed your payment yet."
                      : "The challenge is for registered participants."}
                  </h1>

                  {status === "unpaid" ? (
                    <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
                      We have your registration for the {OFFER.name} ({OFFER.dateLabel}) under{" "}
                      {email}. Your seat is confirmed once your {inr(OFFER.price)} payment comes
                      through — usually within a minute of paying.
                    </p>
                  ) : (
                    <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
                      You&rsquo;re signed in as {email}, and we can&rsquo;t find a registration for
                      the {OFFER.name} ({OFFER.dateLabel}) under that email.
                    </p>
                  )}

                  <ul className="mt-5 space-y-2 text-[13.5px] leading-relaxed text-lo">
                    {status === "unpaid" ? (
                      <>
                        <li>
                          <span className="text-mid">Haven&rsquo;t paid yet?</span> Complete the
                          payment to reserve your seat.
                        </li>
                        <li>
                          <span className="text-mid">Already paid?</span> Use the same email on the
                          payment page. If it still shows here, message us your payment ID.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <span className="text-mid">Registered with another email?</span> Sign in
                          with that one instead.
                        </li>
                        <li>
                          <span className="text-mid">Not registered yet?</span> Register, and sign in
                          with the same email you give us.
                        </li>
                      </>
                    )}
                  </ul>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                      {status === "unpaid" ? (
                        <a href={OFFER.paymentUrl}>
                          Pay {inr(OFFER.price)}
                          <ArrowRight />
                        </a>
                      ) : (
                        <Link href={OFFER_ROUTE}>
                          Register now
                          <ArrowRight />
                        </Link>
                      )}
                    </Button>
                    <form action={switchChallengeAccount} className="w-full sm:w-auto">
                      <input type="hidden" name="next" value={next} />
                      <Button type="submit" variant="secondary" size="lg" className="w-full">
                        Use a different email
                      </Button>
                    </form>
                  </div>
                </>
              )}

              <p className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-line pt-5 text-[13px] text-lo">
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                {status === "unregistered" ? "Registered but still locked out?" : "Questions?"}
                <a
                  href={whatsappUrl(
                    status === "unpaid"
                      ? `Hi Operator Forge, I've paid for the ${OFFER.name} with ${operator.email}. My payment ID is: `
                      : `Hi Operator Forge, I have a question about my access to the ${OFFER.name}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ember-400 underline-offset-4 hover:underline"
                >
                  WhatsApp us on {OFFER.whatsapp.display}
                </a>
              </p>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
