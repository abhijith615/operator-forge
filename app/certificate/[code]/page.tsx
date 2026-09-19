import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BadgeCheck, SearchX } from "lucide-react";

import { CertificateCard } from "@/components/certificate/certificate-card";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeNav } from "@/components/home/home-nav";
import { LightCanvas } from "@/components/offer/offer-client";
import { cohortLabel, formatDate, verifyCertificate } from "@/lib/challenge/certificate";
import { OFFER, OFFER_ROUTE } from "@/lib/constants/offer";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#FAF7F0", colorScheme: "light" };

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const certificate = await verifyCertificate((await params).code);
  return {
    title: certificate ? `Certificate ${certificate.code}` : "Certificate not found",
    description: certificate
      ? `${certificate.fullName} completed the ${OFFER.name} with Operator Forge.`
      : "This certificate code does not match a certificate issued by Operator Forge.",
    // A person's name is on this page; it is for whoever they send the link to.
    robots: { index: false, follow: false },
  };
}

/** Anyone holding the link can check a certificate is genuine. */
export default async function VerifyCertificatePage({ params }: Props) {
  const { code } = await params;
  const certificate = await verifyCertificate(code);

  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <HomeNav />
      <main id="main" className="mx-auto max-w-5xl px-5 pt-10 pb-20 sm:px-6 lg:pt-16">
        {certificate ? (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#128C7E] px-3 py-1.5 text-[13px] font-semibold text-white">
                <BadgeCheck className="size-4" aria-hidden />
                Verified certificate
              </p>
              <h1 className="mt-5 text-[clamp(2rem,5.4vw,3.2rem)] leading-[1.02] font-bold tracking-[-0.045em]">
                {certificate.fullName} completed the {OFFER.name}.
              </h1>
              <dl className="mt-6 space-y-3 text-[14.5px]">
                {[
                  ["Certificate ID", certificate.code],
                  ["Programme", `${OFFER.name} · ${cohortLabel(certificate.cohort)}`],
                  ["Completed", formatDate(certificate.completedAt)],
                  ["Issued by", "Operator Forge"],
                ].map(([term, value]) => (
                  <div key={term} className="border-b border-black/10 pb-3">
                    <dt className="font-mono text-[10.5px] tracking-[0.2em] text-[#6B6B6B] uppercase">{term}</dt>
                    <dd className="mt-0.5 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-[13px] leading-relaxed text-[#6B6B6B]">
                Awarded for completing five live quick-commerce operations simulations and a live AMA with an
                operations leader. A certificate of completion, not an employment certification or professional
                qualification.
              </p>
            </div>
            <CertificateCard certificate={certificate} className="mx-2.5 sm:mx-3.5" />
          </div>
        ) : (
          <div className="max-w-xl">
            <span className="grid size-12 place-items-center rounded-full bg-[#0B0B0B] text-ember-500">
              <SearchX className="size-6" aria-hidden />
            </span>
            <h1 className="mt-5 text-[clamp(2rem,5.4vw,3rem)] leading-[1.02] font-bold tracking-[-0.045em]">
              We can&rsquo;t find that certificate.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-[#3D3D3D]">
              No certificate issued by Operator Forge has the ID{" "}
              <span className="font-mono font-semibold break-all text-[#0B0B0B]">{code.slice(0, 40)}</span>. Check it
              was copied exactly — IDs look like <span className="font-mono">OF-1A2B-3C4D-5E6F</span>.
            </p>
            <Link
              href={OFFER_ROUTE}
              className="mt-7 inline-flex h-12 items-center rounded-full bg-[#0B0B0B] px-6 text-[15px] font-semibold text-white hover:bg-[#262626]"
            >
              About the {OFFER.name}
            </Link>
          </div>
        )}
      </main>
      <HomeFooter />
    </div>
  );
}
