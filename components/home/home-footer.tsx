import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { LEGAL_LINKS } from "@/lib/constants/legal";
import { OFFER, OFFER_ROUTE, mailtoUrl, whatsappUrl } from "@/lib/constants/offer";
import { cn } from "@/lib/utils";

const FOCUS =
  "rounded-sm focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B] focus-visible:outline-none";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Programmes",
    links: [
      { label: "7-Day Challenge", href: OFFER_ROUTE },
      { label: "Challenge overview", href: "/challenge" },
      { label: "Platform", href: "/#platform" },
    ],
  },
  {
    title: "Operator",
    links: [
      { label: "Start Mission", href: "/brief" },
      { label: "Sign in", href: "/login" },
      { label: `WhatsApp ${OFFER.whatsapp.display}`, href: whatsappUrl(), external: true },
      { label: OFFER.email, href: mailtoUrl(), external: true },
    ],
  },
  { title: "Legal", links: [...LEGAL_LINKS] },
];

/** A low skyline along the top edge, generated once and deterministically. */
function skyline(): { x: number; w: number; h: number }[] {
  const buildings: { x: number; w: number; h: number }[] = [];
  let x = 0;
  let seed = 11;
  while (x < 1200) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 16 + Math.round((seed / 233280) * 30);
    const h = 16 + Math.round((((seed * 13) % 97) / 97) * 88);
    buildings.push({ x, w, h });
    x += w + 3;
  }
  return buildings;
}

const SKYLINE = skyline();

/** Footer for the cream pages: the homepage and the legal documents. */
export function HomeFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#0B0B0B] text-white">
      <svg
        aria-hidden
        viewBox="0 0 1200 110"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-20 w-full text-white/[0.06]"
      >
        {SKYLINE.map((b) => (
          <rect key={b.x} x={b.x} y={110 - b.h} width={b.w} height={b.h} fill="currentColor" />
        ))}
      </svg>

      <div className="relative mx-auto max-w-6xl px-5 pt-28 pb-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" aria-label="Operator Forge home" className={cn("inline-flex items-center gap-2.5", FOCUS)}>
              <LogoMark className="size-8" />
              <span className="text-[17px] font-semibold tracking-[-0.02em]">Operator Forge</span>
            </Link>
            <p className="mt-5 font-mono text-[11px] tracking-[0.24em] text-white/55 uppercase">
              Operations builds careers
            </p>
            <p className="mt-1.5 text-[22px] font-bold tracking-[-0.03em]">
              Better operators. <span className="text-ember-500">A brighter India.</span>
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-mono text-[10.5px] tracking-[0.24em] text-white/45 uppercase">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn("text-[14px] text-white/70 transition-colors hover:text-white", FOCUS)}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className={cn("text-[14px] text-white/70 transition-colors hover:text-white", FOCUS)}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11.5px] leading-relaxed text-white/45 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">
            Scorecards and operator profiles are a practice assessment from simulated shifts, not an employment
            certification. Operator Forge is independent and not affiliated with, or endorsed by, Zepto, Swiggy
            Instamart or Blinkit.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} Operator Forge</p>
        </div>
      </div>
    </footer>
  );
}
