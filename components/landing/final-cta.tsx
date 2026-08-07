import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container, Section } from "@/components/landing/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/visuals/aurora";
import { FIRST_SHIFT } from "@/lib/constants/mission";

export function FinalCta() {
  return (
    <Section className="overflow-hidden">
      <Container>
        <div className="panel sheen grain relative isolate overflow-hidden px-6 py-20 text-center sm:px-16 sm:py-28">
          <Aurora className="opacity-70" />

          <Reveal>
            <p className="font-mono text-[10.5px] tracking-[0.22em] text-ember-500 uppercase">
              {FIRST_SHIFT.codename} · {FIRST_SHIFT.name}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h2 className="mx-auto mt-6 max-w-3xl text-[clamp(2.1rem,5.2vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-gradient text-balance">
              The store opens at nine. Somebody has to run it.
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-mid text-balance">
              One shift. Thirty minutes. More work than anyone could finish, and
              nobody to tell you which half matters.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                <Link href="/brief">
                  Start Mission
                  <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
                </Link>
              </Button>
              <span className="font-mono text-[11px] tracking-[0.12em] text-faint uppercase">
                Google or email · 20 seconds
              </span>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
