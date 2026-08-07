import { CircleAlert, CircleCheck, CircleDot } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { StoryBeat, StoryTone } from "@/types/genome";

const TONE = {
  positive: { icon: CircleCheck, ring: "border-ion-500/25 bg-ion-500/[0.06]", text: "text-ion-400" },
  critical: { icon: CircleAlert, ring: "border-alert-500/25 bg-alert-500/[0.05]", text: "text-alert-500" },
  neutral: { icon: CircleDot, ring: "border-line bg-white/[0.02]", text: "text-lo" },
} satisfies Record<StoryTone, unknown> as Record<
  StoryTone,
  { icon: typeof CircleDot; ring: string; text: string }
>;

/**
 * The shift, told back. Every beat is anchored to a real minute and a real
 * decision — this is a debrief, not a personality reading.
 */
export function Reflection({ story }: { story: StoryBeat[] }) {
  return (
    <section>
      <Reveal>
        <h3 className="text-[19px] font-medium tracking-[-0.02em] text-hi">
          What happened
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mid">
          Six moments from your thirty minutes, in the order they happened.
        </p>
      </Reveal>

      <RevealGroup gap={0.07} className="relative mt-8">
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-[1.1rem] w-px bg-line"
        />
        <ol className="space-y-4">
          {story.map((beat, index) => {
            const style = TONE[beat.tone];
            const Icon = style.icon;
            return (
              <RevealItem key={`${beat.at}-${index}`} className="relative flex gap-4">
                <span
                  className={cn(
                    "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border ring-4 ring-void",
                    style.ring,
                  )}
                >
                  <Icon className={cn("size-4", style.text)} />
                </span>

                <div className="min-w-0 flex-1 rounded-card border border-line bg-surface px-5 py-4">
                  <h4 className="text-[14px] font-medium text-hi">{beat.title}</h4>
                  <p className="mt-2 text-[14px] leading-relaxed text-mid">{beat.body}</p>
                </div>
              </RevealItem>
            );
          })}
        </ol>
      </RevealGroup>
    </section>
  );
}
