"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { BOOTCAMP } from "@/lib/constants/operator-bootcamp";
import { cn } from "@/lib/utils";

import { AnchorLink } from "./anchor-link";
import { CTAButton } from "./cta-button";
import { CONTAINER } from "./section";

const FOCUS = "focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7] focus-visible:outline-none";

/**
 * Sticky header: wordmark, the four section links and "Apply now". On phones
 * the links fold into a menu that opens and closes from the keyboard too.
 */
export function BootcampHeader() {
  const { nav, brand } = BOOTCAMP;
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const firstLink = React.useRef<HTMLDivElement>(null);
  const toggle = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    firstLink.current?.querySelector("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        scrolled || open ? "border-[#E6E4DD] bg-[#FAFAF7]/92 backdrop-blur-md" : "border-transparent bg-[#FAFAF7]",
      )}
    >
      <div className={cn(CONTAINER, "flex h-16 items-center gap-4")}>
        <Link href="/" prefetch={false} aria-label={brand.homeLabel} className={cn("flex items-center gap-2.5 rounded-lg", FOCUS)}>
          <span className="grid size-9 place-items-center rounded-lg bg-[#111111]">
            <LogoMark className="size-7" />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.02em] whitespace-nowrap text-[#111111]">{brand.name}</span>
        </Link>

        <nav aria-label={nav.label} className="mx-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.links.map((link) => (
              <li key={link.href}>
                <AnchorLink
                  href={link.href}
                  className={cn("rounded-full px-3.5 py-2 text-[15px] font-medium text-[#3A3A36] transition-colors hover:bg-black/[0.05] hover:text-[#111111]", FOCUS)}
                >
                  {link.label}
                </AnchorLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <CTAButton label={nav.cta} location="header" variant="compact" arrow={false} className="hidden sm:inline-flex" />
          <button
            ref={toggle}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="bootcamp-menu"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            className={cn("grid size-10 place-items-center rounded-full text-[#111111] hover:bg-black/[0.06] md:hidden", FOCUS)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Phone menu. Closes on a link, on Escape, or from the same button. */}
      <div id="bootcamp-menu" hidden={!open} className="border-t border-[#E6E4DD] bg-[#FAFAF7] md:hidden">
        <div ref={firstLink} className={cn(CONTAINER, "py-3")}>
          <ul>
            {nav.links.map((link) => (
              <li key={link.href}>
                <AnchorLink
                  href={link.href}
                  onNavigate={() => setOpen(false)}
                  className={cn("block rounded-lg py-3 text-[20px] font-semibold tracking-[-0.02em] text-[#111111]", FOCUS)}
                >
                  {link.label}
                </AnchorLink>
              </li>
            ))}
          </ul>
          <CTAButton label={nav.cta} location="header-menu" variant="primary" className="mt-3 w-full" />
        </div>
      </div>
    </header>
  );
}
