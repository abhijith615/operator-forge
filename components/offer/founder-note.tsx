import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { RegisterButton } from "@/components/offer/offer-client";
import { OFFER } from "@/lib/constants/offer";
import { hand } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Who built this, in as few words as it takes: a face, one line of
 * background, and the reason the product exists. Deliberately not a
 * biography — it earns trust and gets out of the way.
 */
export function FounderNote() {
  const { founder } = OFFER;

  return (
    <section aria-labelledby="founder" className="border-t border-black/[0.07] bg-white/60">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-12">
          {/* The photo, on its yellow block */}
          <div className="relative mx-auto w-full max-w-[260px] md:mx-0 md:max-w-none">
            <span aria-hidden className="absolute -inset-2.5 rotate-[-2deg] rounded-[26px] bg-ember-500" />
            <Image
              src={founder.photo}
              alt={`${founder.name}, ${founder.role}`}
              width={640}
              height={640}
              sizes="(min-width: 768px) 300px, 260px"
              className="relative aspect-square w-full rounded-[22px] border-[3px] border-[#0B0B0B] object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">Who built this</p>
            <h2
              id="founder"
              className="mt-3 text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em] text-balance"
            >
              Built by an Operator, Not Just an Educator
            </h2>

            <p className="mt-5 text-[17px] font-bold tracking-[-0.02em]">
              {founder.name}
              <span className="font-medium text-[#6B6B6B]"> — {founder.role}</span>
            </p>
            <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-[#3D3D3D]">{founder.bio}</p>

            <blockquote className="mt-6 border-l-[3px] border-ember-500 pl-5">
              <p className={cn(hand.className, "text-[clamp(1.25rem,2.6vw,1.6rem)] leading-[1.35] text-[#0B0B0B]")}>
                &ldquo;{founder.quote}&rdquo;
              </p>
            </blockquote>

            <RegisterButton
              size="sm"
              className="mt-7 gap-1.5 border-0 bg-none px-0 text-[15px] font-semibold text-[#0B0B0B] underline-offset-[6px] shadow-none hover:underline hover:brightness-100 [&_svg]:transition-transform hover:[&_svg]:translate-x-1"
            >
              Experience the 7-Day Challenge
              <ArrowRight className="size-4" />
            </RegisterButton>
          </div>
        </div>
      </div>
    </section>
  );
}
