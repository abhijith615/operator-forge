import Image from "next/image";
import { Quote } from "lucide-react";

import { PROFILE_PREVIEW, TESTIMONIALS } from "@/data/testimonials";

/**
 * What people who ran the challenge said, and a look at a real Operator
 * Profile.
 *
 * Both halves are data-driven and both disappear when there is no data: an
 * empty testimonial list renders nothing at all, rather than a section of
 * placeholders. See `data/testimonials.ts`.
 */
export function Testimonials() {
  const hasQuotes = TESTIMONIALS.length > 0;
  if (!hasQuotes && !PROFILE_PREVIEW) return null;

  return (
    <section aria-labelledby="testimonials" className="border-t border-black/[0.07] bg-white/60">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
        <h2
          id="testimonials"
          className="max-w-2xl text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em] text-balance"
        >
          {hasQuotes ? "From people who ran it" : "A real Operator Profile"}
        </h2>

        <div className="mt-8 grid items-start gap-3 lg:grid-cols-12">
          {hasQuotes ? (
            <ul className={PROFILE_PREVIEW ? "grid gap-3 sm:grid-cols-2 lg:col-span-7" : "grid gap-3 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-3"}>
              {TESTIMONIALS.map((entry) => (
                <li key={`${entry.name}-${entry.quote.slice(0, 24)}`} className="flex h-full flex-col rounded-[22px] border border-black/10 bg-white p-6">
                  <Quote className="size-5 text-ember-500" aria-hidden />
                  <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-[#0B0B0B]">
                    &ldquo;{entry.quote}&rdquo;
                  </blockquote>
                  <p className="mt-4 text-[14px] font-bold tracking-[-0.01em]">
                    {entry.name}
                    <span className="block text-[12.5px] font-medium text-[#6B6B6B]">{entry.context}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {PROFILE_PREVIEW ? (
            <figure className={hasQuotes ? "lg:col-span-5" : "lg:col-span-7"}>
              <div className="overflow-hidden rounded-[22px] border border-black/10 bg-white p-2.5">
                <Image
                  src={PROFILE_PREVIEW.src}
                  alt={PROFILE_PREVIEW.alt}
                  width={PROFILE_PREVIEW.width}
                  height={PROFILE_PREVIEW.height}
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="h-auto w-full rounded-[14px]"
                />
              </div>
              <figcaption className="mt-3 text-[12.5px] text-[#6B6B6B]">
                A sample Operator Profile, as it appears in your account after the five simulations.
              </figcaption>
            </figure>
          ) : null}
        </div>
      </div>
    </section>
  );
}
