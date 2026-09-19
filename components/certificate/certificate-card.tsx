import { Award } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { cohortLabel, formatDate, type Certificate } from "@/lib/challenge/certificate";
import { OFFER } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

/**
 * The certificate on screen — the same layout as the downloadable PNG, for the
 * participant's page and the public verification page.
 */
export function CertificateCard({ certificate, className }: { certificate: Certificate; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="absolute -inset-2.5 rotate-1 rounded-[22px] bg-ember-500 sm:-inset-3.5" />
      <figure className="relative rounded-[18px] border-[5px] border-[#0B0B0B] bg-[#FAF7F0] px-5 py-7 text-[#0B0B0B] sm:px-10 sm:py-9">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0B0B0B]">
              <LogoMark className="size-6" />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em]">Operator Forge</span>
          </div>
          <span className="font-mono text-[10.5px] tracking-[0.12em] text-[#6B6B6B]">{certificate.code}</span>
        </div>

        <div className="mt-8 text-center">
          <p className="font-mono text-[10px] tracking-[0.34em] text-[#6B6B6B] uppercase sm:text-[11px]">
            Certificate of completion
          </p>
          <p className="mt-4 text-[13px] text-[#6B6B6B]">This certifies that</p>
          <figcaption className="mx-auto mt-1 w-fit border-b-[3px] border-ember-500 pb-1.5 text-[clamp(1.6rem,6vw,2.6rem)] leading-tight font-bold tracking-[-0.04em]">
            {certificate.fullName}
          </figcaption>
          <p className="mt-4 text-[13.5px] text-[#3D3D3D]">has successfully completed the</p>
          <p className="mt-0.5 text-[clamp(1.1rem,3.6vw,1.45rem)] leading-tight font-bold tracking-[-0.02em]">
            {OFFER.name}
          </p>
          <p className="mt-1 text-[13px] text-[#3D3D3D]">
            Five live quick-commerce operations simulations · {cohortLabel(certificate.cohort)}
          </p>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-bold">{formatDate(certificate.completedAt)}</p>
            <div className="mt-1 h-px w-28 bg-[#0B0B0B]/25 sm:w-36" />
            <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-[#6B6B6B] uppercase">Date of completion</p>
          </div>
          <span className="grid size-14 shrink-0 place-items-center rounded-full border-[3px] border-[#0B0B0B] bg-ember-500 sm:size-16">
            <Award className="size-7" aria-hidden />
          </span>
        </div>
      </figure>
    </div>
  );
}
