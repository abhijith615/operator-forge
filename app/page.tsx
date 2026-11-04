import type { Metadata, Viewport } from "next";

import { HomeFooter } from "@/components/home/home-footer";
import { HomeHero } from "@/components/home/home-hero";
import { HomeNav } from "@/components/home/home-nav";
import { AssessmentsSection, ClosingSection, ProblemSection, SolutionSection, WhoWeHelpSection } from "@/components/home/home-sections";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { LightCanvas } from "@/components/offer/offer-client";

export const metadata: Metadata = {
  title: { absolute: "Operator Forge — Simulation-Based Hiring & Skills Assessment" },
  description:
    "See how candidates work before you hire. Realistic, role-specific job simulations for Operations, Business Operations, Founder's Office, Strategy, Customer Success and other non-technical roles.",
  openGraph: {
    title: "Operator Forge — See How They Work. Before You Hire.",
    description: "Simulation-based hiring and skills assessment for non-technical roles. Go beyond resumes and interviews. Hire with evidence.",
  },
};

/** The homepage wears the campaign palette: cream, black, yellow. */
export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
};

/**
 * The homepage, for employers first: what Operator Forge is, the problem, the
 * answer, role-specific assessments, then who else it serves. Students reach the
 * 7-Day Challenge and the trial mission from "Who we help". No hiring test is
 * linked from here.
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <ScrollProgress />
      <HomeNav />
      <main id="main" className="relative overflow-x-clip">
        <HomeHero />
        <ProblemSection />
        <SolutionSection />
        <AssessmentsSection />
        <WhoWeHelpSection />
        <ClosingSection />
      </main>
      <HomeFooter />
    </div>
  );
}
