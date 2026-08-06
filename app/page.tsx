import { Capabilities } from "@/components/landing/capabilities";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Handover } from "@/components/landing/handover";
import { Hero } from "@/components/landing/hero";
import { HowItRuns } from "@/components/landing/how-it-runs";
import { LandingNav } from "@/components/landing/landing-nav";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { Standings } from "@/components/landing/standings";
import { Testimonials } from "@/components/landing/testimonials";
import { Horizon } from "@/components/visuals/aurora";

export default function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <LandingNav />
      <main id="main" className="relative overflow-x-clip">
        <Hero />
        <Horizon />
        <Handover />
        <Horizon />
        <HowItRuns />
        <Horizon />
        <Capabilities />
        <Horizon />
        <Standings />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
