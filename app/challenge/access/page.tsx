import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";

import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import { Container, Section } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { getOperator } from "@/lib/auth/session";
import { hasChallengeAccess } from "@/lib/challenge/access";
import { switchChallengeAccount } from "@/lib/challenge/access-actions";
import { OFFER, OFFER_ROUTE, whatsappUrl } from "@/lib/constants/offer";
import { LOGIN_ROUTE, safeNext } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Registered participants only",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where an operator lands when their account's email has no registration.
 * Most often they registered with one address and signed in with another, so
 * switching account is offered as plainly as registering.
 */
export default async function ChallengeAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next, "/challenge/day-1");

  const operator = await getOperator();
  if (!operator) redirect(`${LOGIN_ROUTE}?next=${encodeURIComponent(next)}`);
  // Registered after all — perhaps they just finished the form in another tab.
  if (await hasChallengeAccess()) redirect(next);

  return (
    <>
      <LandingNav />
      <main id="main" className="relative overflow-x-clip">
        <Section className="pt-32 sm:pt-40">
          <Container className="max-w-xl">
            <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
              <span className="grid size-11 place-items-center rounded-full border border-ember-500/30 bg-ember-500/10 text-ember-400">
                <LockKeyhole className="size-5" aria-hidden />
              </span>

              <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-hi text-balance">
                The challenge is for registered participants.
              </h1>

              <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
                You&rsquo;re signed in as{" "}
                <span className="font-medium break-all text-hi">{operator.email}</span>, and we
                can&rsquo;t find a registration for the {OFFER.name} ({OFFER.dateLabel}) under that
                email.
              </p>

              <ul className="mt-5 space-y-2 text-[13.5px] leading-relaxed text-lo">
                <li>
                  <span className="text-mid">Registered with another email?</span> Sign in with
                  that one instead.
                </li>
                <li>
                  <span className="text-mid">Not registered yet?</span> Register, and sign in with
                  the same email you give us.
                </li>
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                  <Link href={OFFER_ROUTE}>
                    Register now
                    <ArrowRight />
                  </Link>
                </Button>
                <form action={switchChallengeAccount} className="w-full sm:w-auto">
                  <input type="hidden" name="next" value={next} />
                  <Button type="submit" variant="secondary" size="lg" className="w-full">
                    Use a different email
                  </Button>
                </form>
              </div>

              <p className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-line pt-5 text-[13px] text-lo">
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                Registered but still locked out?
                <a
                  href={whatsappUrl(
                    `Hi Operator Forge, I registered for the ${OFFER.name} but can't open the challenge.`,
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
