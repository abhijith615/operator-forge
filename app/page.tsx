import type { Viewport } from "next";

import { HomeFooter } from "@/components/home/home-footer";
import { HomeNav } from "@/components/home/home-nav";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Platform } from "@/components/landing/platform";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { LightCanvas } from "@/components/offer/offer-client";

/** The homepage wears the challenge campaign's palette: cream, black, yellow. */
export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <ScrollProgress />
      <HomeNav />
      <main id="main" className="relative overflow-x-clip">
        <Hero />
        <Platform />
        <FinalCta />
      </main>
      <HomeFooter />
    </div>
  );
}
