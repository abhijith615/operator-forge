import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, Award, Check, Download, Linkedin, Mic } from "lucide-react";

import { CertificateCard } from "@/components/certificate/certificate-card";
import { CopyLink } from "@/components/certificate/copy-link";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeNav } from "@/components/home/home-nav";
import { LightCanvas } from "@/components/offer/offer-client";
import { requireChallengeAccess } from "@/lib/challenge/access";
import {
  CERTIFICATE_DOWNLOAD_ROUTE,
  CERTIFICATE_ROUTE,
  DAYS_REQUIRED,
  issueCertificate,
  linkedInUrl,
  readCertificateProgress,
  verificationPath,
} from "@/lib/challenge/certificate";
import { readOwnRun } from "@/lib/challenge/runs";
import { OFFER, OFFER_DAYS, whatsappUrl } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your certificate",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#FAF7F0", colorScheme: "light" };

export const dynamic = "force-dynamic";

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function CertificatePage() {
  const operator = await requireChallengeAccess(CERTIFICATE_ROUTE);
  const progress = await readCertificateProgress();
  const certificate = progress?.eligible ? await issueCertificate() : null;

  // Which days are done, for the checklist.
  const runs = await Promise.all(
    Array.from({ length: DAYS_REQUIRED }, (_, index) => readOwnRun(index + 1)),
  );
  const done = runs.map(Boolean);
  const nextDay = done.findIndex((isDone) => !isDone) + 1;
  const daysComplete = nextDay === 0;
  const amaDone = Boolean(progress?.amaAttended || progress?.isAdmin);
  const stepsDone = done.filter(Boolean).length + (amaDone ? 1 : 0);
  const stepsTotal = DAYS_REQUIRED + 1;
  const amaDate = OFFER_DAYS[6]?.date ?? "Day 7";

  const verifyUrl = certificate ? `${await origin()}${verificationPath(certificate.code)}` : null;

  return (
    <div className="min-h-dvh bg-[#FAF7F0] text-[#0B0B0B] antialiased">
      <LightCanvas />
      <HomeNav />
      <main id="main" className="mx-auto max-w-5xl px-5 pt-10 pb-20 sm:px-6 lg:pt-16">
        <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.24em] text-[#6B6B6B] uppercase">
          <Award className="size-4" aria-hidden />
          Certificate of completion
        </p>

        {certificate && verifyUrl ? (
          <>
            <h1 className="mt-3 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1] font-bold tracking-[-0.05em]">
              You did it, {certificate.fullName.split(" ")[0]}.
            </h1>
            <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-[#3D3D3D]">
              All five simulations and the live AMA complete. Here is your certificate — download it, add it to
              LinkedIn, and share the verification link so anyone can check it is genuine.
            </p>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
              <CertificateCard certificate={certificate} className="mx-2.5 sm:mx-3.5" />

              <div className="space-y-3">
                <a
                  href={CERTIFICATE_DOWNLOAD_ROUTE}
                  download
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-full bg-ember-500 px-6 text-[15px] font-semibold text-[#0B0B0B] shadow-[0_10px_28px_-12px_rgba(245,196,0,0.9)] transition hover:brightness-105",
                    FOCUS,
                  )}
                >
                  <Download className="size-4" aria-hidden />
                  Download certificate (PNG)
                </a>
                <a
                  href={linkedInUrl(certificate, verifyUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-full bg-[#0A66C2] px-6 text-[15px] font-semibold text-white transition hover:brightness-110",
                    FOCUS,
                  )}
                >
                  <Linkedin className="size-4" aria-hidden />
                  Add to LinkedIn
                </a>
                <CopyLink url={verifyUrl} className="w-full" />

                <div className="rounded-[18px] border border-black/10 bg-white p-4 text-[13px] leading-relaxed text-[#3D3D3D]">
                  <p>
                    Certificate ID <span className="font-mono font-semibold text-[#0B0B0B]">{certificate.code}</span>
                  </p>
                  <p className="mt-1">
                    Verify at{" "}
                    <Link href={verificationPath(certificate.code)} className="font-medium break-all text-[#0B0B0B] underline underline-offset-4">
                      {verifyUrl.replace(/^https?:\/\//, "")}
                    </Link>
                  </p>
                  <p className="mt-3 text-[12px] text-[#6B6B6B]">
                    The name is the one on your account when the certificate was issued. If it is wrong,{" "}
                    <a
                      href={whatsappUrl(`Hi Operator Forge, the name on my certificate ${certificate.code} needs correcting.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#0B0B0B] underline underline-offset-4"
                    >
                      message us
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1] font-bold tracking-[-0.05em]">
              {daysComplete ? "Almost there." : "Your certificate is waiting."}
            </h1>
            <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-[#3D3D3D]">
              Complete all five simulations — Days 1 to 5 — and attend the live AMA on Day 7, and your certificate of
              completion for the {OFFER.name} unlocks here, ready to download and add to LinkedIn.
            </p>

            <div className="mt-8 max-w-xl rounded-[22px] border border-black/10 bg-white p-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[17px] font-bold">Your progress</p>
                <p className="font-mono text-[13px] text-[#6B6B6B]">
                  {stepsDone} / {stepsTotal} steps
                </p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#F1ECE1]">
                <div
                  className="h-full rounded-full bg-ember-500"
                  style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
                />
              </div>
              <ol className="mt-5 space-y-2">
                {done.map((isDone, index) => (
                  <li key={index} className="flex items-center gap-3 text-[14.5px]">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-[12px] font-bold",
                        isDone ? "bg-[#0B0B0B] text-ember-500" : "border border-black/20 text-[#6B6B6B]",
                      )}
                    >
                      {isDone ? <Check className="size-3.5" aria-hidden /> : index + 1}
                    </span>
                    <span className={isDone ? "text-[#0B0B0B]" : "text-[#6B6B6B]"}>
                      Day {index + 1}
                      <span className="sr-only">{isDone ? " — complete" : " — not yet played"}</span>
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-3 text-[14.5px]">
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-[12px] font-bold",
                      amaDone ? "bg-[#0B0B0B] text-ember-500" : "border border-black/20 text-[#6B6B6B]",
                    )}
                  >
                    {amaDone ? <Check className="size-3.5" aria-hidden /> : <Mic className="size-3.5" aria-hidden />}
                  </span>
                  <span className={amaDone ? "text-[#0B0B0B]" : "text-[#6B6B6B]"}>
                    Day 7 · Attend the live AMA ({amaDate})
                    <span className="sr-only">{amaDone ? " — complete" : " — not yet"}</span>
                  </span>
                </li>
              </ol>

              {nextDay > 0 ? (
                <Link
                  href={`/challenge/day-${nextDay}`}
                  className={cn(
                    "mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#0B0B0B] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#262626]",
                    FOCUS,
                  )}
                >
                  Play Day {nextDay}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : !amaDone ? (
                <p className="mt-6 text-[14px] leading-relaxed text-[#3D3D3D]">
                  All five simulations done. Join the live AMA on {amaDate} — we record attendance there, and your
                  certificate unlocks here shortly after.
                </p>
              ) : !operator.fullName ? (
                <p className="mt-6 text-[14px] text-[#3D3D3D]">
                  Add your name in your profile so it can go on the certificate.
                </p>
              ) : (
                <p className="mt-6 text-[14px] text-[#3D3D3D]">
                  Everything is done. If your certificate does not appear,{" "}
                  <a
                    href={whatsappUrl("Hi Operator Forge, I finished all five days and the AMA but cannot see my certificate.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-4"
                  >
                    message us on WhatsApp
                  </a>
                  .
                </p>
              )}
            </div>
          </>
        )}
      </main>
      <HomeFooter />
    </div>
  );
}
