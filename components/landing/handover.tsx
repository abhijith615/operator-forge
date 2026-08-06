"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Clock3, MapPin, ShieldAlert, UserRound } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { FIRST_SHIFT, HANDOVER_MESSAGE } from "@/lib/constants/mission";
import { easing } from "@/lib/motion";

const SPECS = [
  { icon: UserRound, label: "Your role", value: FIRST_SHIFT.role },
  { icon: MapPin, label: "Location", value: FIRST_SHIFT.location },
  { icon: Clock3, label: "Duration", value: `${FIRST_SHIFT.durationMinutes} minutes, uninterrupted` },
  { icon: ShieldAlert, label: "Difficulty", value: FIRST_SHIFT.difficulty },
] as const;

/**
 * The inciting incident. Message lands line by line, with a typing beat in
 * between — the same rhythm the mission itself opens with.
 */
function HandoverThread() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const [visible, setVisible] = React.useState(0);
  const [typing, setTyping] = React.useState(false);

  React.useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const timers: number[] = [];

    HANDOVER_MESSAGE.lines.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setTyping(true);
        }, 400 + index * 900),
      );
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setTyping(false);
          setVisible(index + 1);
        }, 900 + index * 900),
      );
    });

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [inView]);

  const allDelivered = visible >= HANDOVER_MESSAGE.lines.length;

  return (
    <div ref={ref} className="panel sheen grain relative overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="relative">
          <div className="grid size-9 place-items-center rounded-full bg-linear-to-br from-ion-500/30 to-ion-600/10 text-[12px] font-semibold text-ion-400">
            RM
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ion-500 ring-2 ring-surface" />
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-hi">
            {HANDOVER_MESSAGE.handle}
          </div>
          <div className="text-[11.5px] text-lo">{HANDOVER_MESSAGE.from} · online</div>
        </div>
        <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
          WhatsApp
        </span>
      </div>

      <div className="min-h-[16.5rem] space-y-2 px-5 py-6">
        {HANDOVER_MESSAGE.lines.slice(0, visible).map((line, index) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: easing.outExpo }}
            className="flex"
          >
            <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line-strong bg-white/[0.045] px-3.5 py-2.5 text-[14.5px] leading-snug text-hi">
              {line}
              <span className="ml-2 font-mono text-[10px] text-faint tabular-nums">
                08:5{index + 2}
              </span>
            </div>
          </motion.div>
        ))}

        {typing ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex"
          >
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-white/[0.03] px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    delay: dot * 0.16,
                    ease: "easeInOut",
                  }}
                  className="size-1.5 rounded-full bg-lo"
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: allDelivered ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        className="border-t border-line px-5 py-3.5"
      >
        <p className="font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
          Seen 08:56 · No further instructions
        </p>
      </motion.div>
    </div>
  );
}

export function Handover() {
  return (
    <Section id="shift" className="scroll-mt-24">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The premise"
              title="Nobody hands you a syllabus on your first morning."
              description={FIRST_SHIFT.summary}
            />

            <RevealGroup className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
              {SPECS.map((spec) => (
                <RevealItem key={spec.label} className="bg-surface p-5">
                  <div className="flex items-center gap-2 text-lo">
                    <spec.icon className="size-3.5" />
                    <span className="text-[10.5px] font-medium tracking-[0.12em] uppercase">
                      {spec.label}
                    </span>
                  </div>
                  <p className="mt-2 text-[14.5px] text-hi">{spec.value}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal delay={0.1}>
            <HandoverThread />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
