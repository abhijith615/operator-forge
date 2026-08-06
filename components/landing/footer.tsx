import Link from "next/link";

import { Container } from "@/components/landing/section";
import { LogoMark } from "@/components/brand/logo";
import { Horizon } from "@/components/visuals/aurora";
import { site } from "@/lib/constants/site";

const COLUMNS = [
  {
    title: "Mission",
    links: [
      { label: "The Shift", href: "#shift" },
      { label: "How it runs", href: "#how" },
      { label: "Capabilities", href: "#capabilities" },
      { label: "Standings", href: "#standings" },
    ],
  },
  {
    title: "Operator",
    links: [
      { label: "Start Mission", href: "/login" },
      { label: "Sign in", href: "/login" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative">
      <Horizon />
      <Container className="py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="size-6" />
              <span className="text-[12.5px] font-semibold tracking-[0.18em] text-hi">
                OPERATOR<span className="text-lo"> FORGE</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-lo">
              {site.tagline} Built for people who will run things, assessed by
              what they actually do.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-mid transition-colors duration-200 hover:text-hi"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] tracking-[0.1em] text-faint">
            © {new Date().getFullYear()} {site.wordmark}
          </p>
          <p className="font-mono text-[11px] tracking-[0.1em] text-faint">
            Mission control for business operations
          </p>
        </div>
      </Container>
    </footer>
  );
}
