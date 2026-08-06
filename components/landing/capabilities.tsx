import { CapabilityRadar } from "@/components/landing/capability-radar";
import { Container, Section, SectionHeading } from "@/components/landing/section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { capabilities } from "@/lib/constants/site";

export function Capabilities() {
  return (
    <Section id="capabilities" className="scroll-mt-24">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <Reveal className="order-2 lg:order-1">
            <CapabilityRadar />
          </Reveal>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="What gets measured"
              title="Ten things a good operator does. None of them are answers."
              description="We never show you a mark. We show you a portrait — built from the order you investigated things, the questions you asked, and what you chose to leave alone."
            />

            <RevealGroup
              gap={0.045}
              className="mt-10 grid grid-cols-1 gap-x-8 gap-y-px sm:grid-cols-2"
            >
              {capabilities.map((capability, index) => (
                <RevealItem
                  key={capability.id}
                  className="group flex gap-3.5 border-b border-line py-4"
                >
                  <span className="mt-0.5 font-mono text-[10px] text-faint tabular-nums transition-colors duration-300 group-hover:text-ember-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-medium text-hi">
                      {capability.name}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-lo">
                      {capability.blurb}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </Container>
    </Section>
  );
}
