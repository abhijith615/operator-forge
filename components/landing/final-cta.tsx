import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { OFFER, OFFER_ROUTE, inr } from "@/lib/constants/offer";
import { hand } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-ember-500 focus-visible:outline-none";

/** The homepage's closing band — the same yellow as the challenge page's. */
export function FinalCta() {
  return (
    <section className="bg-ember-500 text-[#0B0B0B]">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 lg:py-24">
        <Reveal>
          <p className={cn(hand.className, "text-[24px] leading-tight")}>
            Real situations. Real skills. Real opportunities.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2.1rem,6vw,3.8rem)] leading-[1] font-bold tracking-[-0.05em] text-balance">
            The only way to find out is to run one.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-balance text-[#0B0B0B]/75">
            Thirty minutes, one store, and more work than anyone could finish. Your genome is written from what you
            did with it — and it is yours, whatever it says.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/brief"
              className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0B0B0B] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#262626] sm:w-auto",
                FOCUS,
              )}
            >
              Start Mission
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={OFFER_ROUTE}
              className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0B] px-7 text-[15px] font-semibold transition-colors hover:bg-[#0B0B0B] hover:text-white sm:w-auto",
                FOCUS,
              )}
            >
              7-Day Challenge · {inr(OFFER.price)}
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[#0B0B0B]/65">Sign in with Google or email · 20 seconds</p>
        </Reveal>
      </div>
    </section>
  );
}
