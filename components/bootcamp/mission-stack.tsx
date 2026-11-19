import { BOOTCAMP } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

/**
 * The hero's visual: a stack of mission cards instead of a photo, so the
 * hands-on format is the first thing seen. Decorative — the same facts are in
 * the copy — so it is hidden from screen readers apart from its label.
 */
export function MissionStack() {
  const { visual } = BOOTCAMP.hero;
  const [first, current, next] = visual.cards;

  return (
    <figure aria-label={visual.label} className="relative mx-auto w-full max-w-[460px] pt-10 pb-6">
      <div aria-hidden>
        {/* The finished mission, behind. */}
        <div className="absolute inset-x-8 top-0 rounded-2xl border border-[#E6E4DD] bg-[#F6F5F0] px-5 py-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-[#5C5C57] uppercase">
            {first!.tag} · {first!.status}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold text-[#3A3A36]">{first!.title}</p>
        </div>

        {/* The current mission, in front. */}
        <div className="relative rounded-[22px] border border-[#111111] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(17,17,17,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[12px] tracking-[0.16em] text-[#5C5C57] uppercase">{current!.tag}</p>
            <span className="rounded-full bg-ember-500 px-2.5 py-1 text-[12px] font-semibold text-[#111111]">{current!.status}</span>
          </div>
          <p className="mt-3 text-[24px] leading-[1.15] font-bold tracking-[-0.03em]">{current!.title}</p>

          <div className="mt-5">
            <div className="flex justify-between text-[12px] font-medium text-[#5C5C57]">
              <span>{visual.progressLabel}</span>
              <span className="tabular-nums">{current!.progress}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-[#EFEDE6]">
              <div className="h-full rounded-full bg-[#111111]" style={{ width: `${current!.progress}%` }} />
            </div>
          </div>

          <ol className="mt-5 grid gap-2">
            {visual.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-[14px]">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                    index < visual.currentStep && "border-[#111111] bg-[#111111] text-white",
                    index === visual.currentStep && "border-[#111111] bg-ember-500",
                    index > visual.currentStep && "border-[#D9D6CD] text-transparent",
                  )}
                >
                  {index < visual.currentStep ? "✓" : ""}
                </span>
                <span className={index > visual.currentStep ? "text-[#6B6B66]" : "font-medium text-[#111111]"}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* The next mission, peeking out below. */}
        <div className="relative mx-6 -mt-2 rounded-b-2xl border border-t-0 border-[#E6E4DD] bg-[#F3F1EA] px-5 pt-4 pb-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-[#5C5C57] uppercase">
            {next!.tag} · {next!.status}
          </p>
          <p className="mt-1 truncate text-[14px] font-semibold text-[#3A3A36]">{next!.title}</p>
        </div>
      </div>
    </figure>
  );
}
