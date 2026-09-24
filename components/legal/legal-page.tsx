import Link from "next/link";

import { HomeFooter } from "@/components/home/home-footer";
import { HomeNav } from "@/components/home/home-nav";
import { LightCanvas } from "@/components/offer/offer-client";
import { LEGAL_LINKS, LEGAL_UPDATED } from "@/lib/constants/legal";
import { OFFER, mailtoUrl, whatsappUrl } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared frame for the privacy policy and the terms: cream, readable, with contents. */
export function LegalPage({
  title,
  intro,
  sections,
  current,
}: {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <HomeNav />
      <main id="main" className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-6 lg:pt-16">
        <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.href === current ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none",
                link.href === current
                  ? "bg-[#0B0B0B] text-white"
                  : "border border-black/15 text-[#3D3D3D] hover:border-black/40 hover:text-[#0B0B0B]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <h1 className="mt-6 text-[clamp(2.4rem,7vw,4.2rem)] leading-[0.98] font-bold tracking-[-0.05em]">
          {title}
        </h1>
        <p className="mt-4 inline-flex rounded-full bg-ember-500 px-3 py-1 text-[12.5px] font-semibold">
          Last updated {LEGAL_UPDATED}
        </p>
        <div className="mt-6 max-w-3xl space-y-4 text-[16.5px] leading-relaxed text-[#3D3D3D]">{intro}</div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">On this page</p>
            <ol className="mt-3 space-y-1.5 border-l-2 border-black/10 pl-4 text-[13.5px]">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-[#3D3D3D] underline-offset-4 hover:text-[#0B0B0B] hover:underline"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl space-y-4">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-[22px] border border-black/10 bg-white p-6 sm:p-8"
              >
                <h2 className="flex items-baseline gap-3 text-[21px] leading-tight font-bold tracking-[-0.02em]">
                  <span className="font-mono text-[13px] font-semibold text-[#6B6B6B]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#3D3D3D] [&_a]:font-medium [&_a]:text-[#0B0B0B] [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_li]:marker:text-[#0B0B0B] [&_strong]:font-semibold [&_strong]:text-[#0B0B0B] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {section.body}
                </div>
              </section>
            ))}

            <div className="rounded-[22px] bg-[#0B0B0B] p-6 text-white sm:p-8">
              <h2 className="text-[21px] font-bold tracking-[-0.02em]">Questions about this page?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                Message us on WhatsApp or by email, and a person will reply.
              </p>
              <a
                href={whatsappUrl(`Hi Operator Forge, I have a question about your ${title.toLowerCase()}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center rounded-full bg-ember-500 px-5 text-[14px] font-semibold text-[#0B0B0B] transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
              >
                WhatsApp {OFFER.whatsapp.display}
              </a>
              <a
                href={mailtoUrl(`${title} — question`)}
                className="mt-5 ml-3 inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-[14px] font-semibold text-white transition hover:border-white/60 focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none"
              >
                {OFFER.email}
              </a>
            </div>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
