import { ArrowRight, Gauge, ListChecks, Timer } from "lucide-react";

import { ExplainerVideo } from "@/components/challenge/explainer-video";
import { RegisterButton } from "@/components/offer/offer-client";
import { YouTubeFacade } from "@/components/offer/youtube-facade";
import { CHALLENGE_VIDEOS } from "@/lib/challenge/videos";
import { DIMENSIONS, DIMENSION_LABEL } from "@/lib/challenge/types";
import { OFFER, inr } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

/**
 * Proof that the thing being sold is a simulation, not a course: the demo
 * video, then the loop it runs — a decision, the consequence on the store's
 * headline metric, and the profile that gets written from both.
 *
 * Everything quoted here is the product's own: the five assessed dimensions
 * come from the scoring model, and click-to-dispatch is the metric Day 1 is
 * judged on. Nothing is dressed up as a screenshot it is not.
 */

const STEPS = [
  {
    icon: ListChecks,
    step: "Decision",
    title: "You set the floor",
    body: "Breakfast peak, one person short. You decide who picks, who packs and who runs dispatch — then keep deciding as the morning argues back.",
  },
  {
    icon: Timer,
    step: "Consequence",
    title: "The store answers",
    body: "Click-to-dispatch, the number a dark store is judged on, moves in seconds. Orders queue. Riders wait. Nothing resets while you think.",
  },
  {
    icon: Gauge,
    step: "Score & profile",
    title: "Your operator profile",
    body: "Every decision, how long you took and the queue behind it are scored across five dimensions — and become the profile you keep.",
  },
];

export function ProductProof() {
  const demo = CHALLENGE_VIDEOS.simulationDemo;

  return (
    <section aria-labelledby="product-proof" className="border-b border-black/[0.07] bg-white/60">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
        <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">See it before you pay</p>
        <h2
          id="product-proof"
          className="mt-3 max-w-3xl text-[clamp(1.9rem,5vw,3.1rem)] leading-[1.03] font-bold tracking-[-0.045em] text-balance"
        >
          This isn&rsquo;t a recorded course. You make the decisions.
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#3D3D3D]">
          Half a minute inside the product: the screen you run the store from, the calls it puts in front of you, and
          what happens to the numbers when you make them.
        </p>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
          {/* The demo itself */}
          <figure className="min-w-0">
            <div className="rounded-[24px] bg-[#0B0B0B] p-2.5 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.6)] sm:p-3">
              {/* A thumbnail until it is clicked: the embed is a megabyte of
                  script that most visitors from an ad never press play on. */}
              {demo.source.kind === "youtube" ? (
                <YouTubeFacade id={demo.source.id} title={demo.title} />
              ) : (
                <ExplainerVideo video={demo} className="rounded-[16px]" />
              )}
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#6B6B6B]">
              <span className="font-semibold text-[#0B0B0B]">{demo.title}</span>
              <span aria-hidden>·</span>
              33 seconds, recorded inside the simulations. Real screens, not mock-ups.
            </figcaption>
          </figure>

          {/* Decision → consequence → score */}
          <ol className="min-w-0 space-y-3">
            {STEPS.map(({ icon: Icon, step, title, body }, index) => (
              <li key={step} className="relative rounded-[20px] border border-black/10 bg-white p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0B0B0B] text-ember-500">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <p className="font-mono text-[10.5px] tracking-[0.2em] text-[#6B6B6B] uppercase">{step}</p>
                  {index < STEPS.length - 1 ? (
                    <ArrowRight className="ml-auto size-4 rotate-90 text-[#C9C2B4]" aria-hidden />
                  ) : null}
                </div>
                <h3 className="mt-3 text-[17px] leading-tight font-bold tracking-[-0.02em]">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#3D3D3D]">{body}</p>

                {/* The store's headline number, as the simulation shows it. */}
                {step === "Consequence" ? (
                  <div className="mt-4 rounded-[14px] bg-[#0B0B0B] px-4 py-3 text-white">
                    <p className="font-mono text-[9.5px] tracking-[0.18em] text-white/55 uppercase">
                      Click-to-dispatch · target 180s
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-[26px] leading-none font-semibold tabular-nums text-ember-500">
                        204s
                      </span>
                      <span className="text-[12.5px] text-white/60">and climbing while the queue sits</span>
                    </p>
                  </div>
                ) : null}

                {/* The five dimensions the profile is written from. */}
                {step === "Score & profile" ? (
                  <ul className="mt-4 space-y-1.5">
                    {DIMENSIONS.map((dimension, position) => (
                      <li key={dimension} className="flex items-center gap-2.5">
                        <span className="w-[164px] shrink-0 text-[11.5px] text-[#3D3D3D]">
                          {DIMENSION_LABEL[dimension]}
                        </span>
                        <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1ECE1]">
                          <span
                            className={cn("block h-full rounded-full", position === 1 ? "bg-[#0B0B0B]" : "bg-ember-500")}
                            style={{ width: `${[72, 88, 64, 80, 76][position]}%` }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <RegisterButton>
            Register now · {inr(OFFER.price)}
            <ArrowRight />
          </RegisterButton>
          <p className="text-[13px] text-[#6B6B6B]">
            Five simulations like this one, one a day, {OFFER.dateLabel}.
          </p>
        </div>
      </div>
    </section>
  );
}
