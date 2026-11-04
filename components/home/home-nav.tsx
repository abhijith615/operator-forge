"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { useScrolled } from "@/hooks/use-scrolled";
import { DEMO_URL } from "@/lib/constants/home";
import { cn } from "@/lib/utils";

export const HOME_FOCUS =
  "focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none";

/** The homepage sections the nav points at. Absolute, so they work from the certificate and legal pages too. */
const LINKS = [
  { label: "How it works", href: "/#solution" },
  { label: "Assessments", href: "/#assessments" },
  { label: "Who we help", href: "/#who" },
] as const;

/**
 * The homepage header, in cream, black and yellow. Employers first: the one
 * button is "Book a Demo", which opens WhatsApp with the request written.
 */
export function HomeNav() {
  const scrolled = useScrolled(12);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
          scrolled ? "border-black/[0.07] bg-[#FAF7F0]/90 backdrop-blur-md" : "border-transparent bg-[#FAF7F0]",
        )}
      >
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-6">
          <Link href="/" aria-label="Operator Forge home" className={cn("flex items-center gap-2.5 rounded-xl", HOME_FOCUS)}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#0B0B0B]">
              <LogoMark className="size-7" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] whitespace-nowrap text-[#0B0B0B] sm:text-[17px]">
              Operator Forge
            </span>
          </Link>

          <ul className="mx-auto hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[14px] font-medium text-[#3D3D3D] transition-colors hover:bg-black/[0.05] hover:text-[#0B0B0B]",
                    HOME_FOCUS,
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link
              href="/login"
              className={cn(
                "hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-[#3D3D3D] transition-colors hover:text-[#0B0B0B] sm:inline-flex",
                HOME_FOCUS,
              )}
            >
              Sign in
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full border-0 bg-[#0B0B0B] px-3 text-white shadow-none hover:bg-[#262626] sm:pr-3.5",
                HOME_FOCUS,
              )}
            >
              Book a Demo
              <ArrowUpRight className="hidden sm:block" />
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "grid size-10 place-items-center rounded-full text-[#0B0B0B] transition-colors hover:bg-black/[0.06] md:hidden",
                HOME_FOCUS,
              )}
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-90 bg-[#FAF7F0] md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <span className="grid size-9 place-items-center rounded-xl bg-[#0B0B0B]">
                <LogoMark className="size-7" />
              </span>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                className={cn("grid size-10 place-items-center rounded-full text-[#0B0B0B]", HOME_FOCUS)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="mt-4 px-5">
              {[...LINKS, { label: "Sign in", href: "/login" }].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-black/10 py-5 text-[26px] font-bold tracking-[-0.03em] text-[#0B0B0B]"
                  >
                    {link.label}
                    <ArrowUpRight className="size-5 text-[#6B6B6B]" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 px-5">
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full rounded-full border-0 bg-[#0B0B0B] text-white shadow-none hover:bg-[#262626]",
                )}
              >
                Book a Demo
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
