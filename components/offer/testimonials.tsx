import { Quote } from "lucide-react";

import { TESTIMONIALS } from "@/data/testimonials";

/**
 * What people who ran the challenge said.
 *
 * Data-driven, and absent until there is data: an empty list renders nothing
 * at all rather than a section of placeholders. See `data/testimonials.ts`.
 */
export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section aria-labelledby="testimonials" className="border-t border-black/[0.07] bg-white/60">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
        <h2
          id="testimonials"
          className="max-w-2xl text-[clamp(1.7rem,4.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.04em] text-balance"
        >
          From people who ran it
        </h2>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((entry) => (
            <li
              key={`${entry.name}-${entry.quote.slice(0, 24)}`}
              className="flex h-full flex-col rounded-[22px] border border-black/10 bg-white p-6"
            >
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
      </div>
    </section>
  );
}
