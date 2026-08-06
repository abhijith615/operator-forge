import { Flame, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/landing/section";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Sample standings. Operators appear by callsign, never by name — the board is
 * about how the shift was run, not who ran it. Labelled as a sample in the UI.
 */
const ROWS = [
  { rank: 1, callsign: "OP-2291", rating: 1884, delta: 34, streak: 7 },
  { rank: 2, callsign: "OP-1147", rating: 1861, delta: 12, streak: 5 },
  { rank: 3, callsign: "OP-0864", rating: 1840, delta: -8, streak: 4 },
  { rank: 4, callsign: "OP-3305", rating: 1822, delta: 21, streak: 6 },
  { rank: 5, callsign: "OP-0417", rating: 1809, delta: 0, streak: 2 },
] as const;

const HIGHLIGHTS = [
  { label: "Operator Rating", value: 1740, suffix: "", hint: "Composite of ten capabilities" },
  { label: "Missions run", value: 3, suffix: "", hint: "One shift each, no retakes" },
  { label: "Percentile", value: 82, suffix: "th", hint: "Against operators on Hub 114" },
] as const;

function DeltaPill({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[12.5px] text-lo">
        <Minus className="size-3" />
        <span data-readout>0</span>
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12.5px] tabular-nums",
        up ? "text-ion-400" : "text-alert-500",
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {delta}
    </span>
  );
}

export function Standings() {
  return (
    <Section id="standings" className="scroll-mt-24">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Standings"
          title="A board that rewards judgement, not speed."
          description="Ratings move when you run a shift better than you ran the last one. There are no badges, no confetti, and no way to grind it."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Reveal className="panel sheen overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <span className="font-mono text-[10.5px] tracking-[0.16em] text-lo uppercase">
                Season 01 · Hub 114
              </span>
              <Badge tone="neutral">Sample</Badge>
            </div>

            <RevealGroup gap={0.05} className="divide-y divide-line">
              {ROWS.map((row) => (
                <RevealItem
                  key={row.callsign}
                  className={cn(
                    "group grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 px-5 py-4",
                    "transition-colors duration-300 hover:bg-white/[0.025]",
                  )}
                >
                  <span
                    data-readout
                    className={cn(
                      "font-mono text-[13px] tabular-nums",
                      row.rank === 1 ? "text-ember-500" : "text-faint",
                    )}
                  >
                    {String(row.rank).padStart(2, "0")}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-white/[0.035] font-mono text-[10px] text-mid">
                      {row.callsign.slice(3, 5)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono text-[13.5px] text-hi">{row.callsign}</div>
                      <div className="flex items-center gap-1 text-[11.5px] text-lo">
                        <Flame className="size-3 text-ember-500/70" />
                        {row.streak} week streak
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 text-right">
                    <DeltaPill delta={row.delta} />
                    <span
                      data-readout
                      className="w-14 text-[15px] font-medium text-hi tabular-nums"
                    >
                      {row.rating}
                    </span>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </Reveal>

          <RevealGroup gap={0.08} className="grid gap-6">
            {HIGHLIGHTS.map((item) => (
              <RevealItem key={item.label} className="panel sheen p-6">
                <div className="text-[10.5px] font-medium tracking-[0.14em] text-lo uppercase">
                  {item.label}
                </div>
                <div className="mt-3 text-[40px] leading-none font-semibold tracking-[-0.04em] text-hi">
                  <CountUp to={item.value} suffix={item.suffix} />
                </div>
                <p className="mt-2.5 text-[13px] text-lo">{item.hint}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </Section>
  );
}
