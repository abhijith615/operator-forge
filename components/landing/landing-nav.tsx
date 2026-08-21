"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useScrolled } from "@/hooks/use-scrolled";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Every entry must point at a section that is still on the page. `#shift` and
 * `#how` outlived the sections they scrolled to when the landing page stopped
 * being about one mission — a nav link that goes nowhere is worse than one
 * that does not exist.
 */
const links = [
  { label: "Platform", href: "#platform" },
  { label: "What gets measured", href: "#capabilities" },
  { label: "Standings", href: "#standings" },
] as const;

export function LandingNav() {
  const scrolled = useScrolled(24);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: easing.outExpo, delay: 0.1 }}
        className="fixed inset-x-0 top-0 z-80 px-4 pt-3 sm:px-6 sm:pt-4"
      >
        <nav
          className={cn(
            "mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full pr-2 pl-4 sm:pl-5",
            "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out-expo",
            scrolled
              ? "glass shadow-[0_10px_40px_-24px_rgba(0,0,0,0.95)]"
              : "border border-transparent bg-transparent",
          )}
        >
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-full"
            aria-label="Operator Forge home"
          >
            <LogoMark className="size-6 transition-transform duration-500 ease-out-expo group-hover:rotate-90" />
            <span className="text-[12.5px] font-semibold tracking-[0.18em] text-hi">
              OPERATOR<span className="hidden text-lo sm:inline"> FORGE</span>
            </span>
          </Link>

          <div className="mx-auto hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[13px] text-mid",
                  "transition-colors duration-200 hover:text-hi",
                  "after:absolute after:inset-x-3.5 after:bottom-1 after:h-px after:origin-left",
                  "after:scale-x-0 after:bg-ember-500/70 after:transition-transform after:duration-300 after:ease-out-expo",
                  "hover:after:scale-x-100",
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="pr-3.5">
              <Link href="/brief">
                Start Mission
                <ArrowUpRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid size-9 place-items-center rounded-full text-mid transition-colors hover:bg-white/[0.07] hover:text-hi md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-[18px]" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-90 bg-void/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-14 items-center justify-between px-6 pt-3">
              <LogoMark className="size-6" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full text-mid hover:text-hi"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
              className="mt-8 flex flex-col gap-1 px-6"
            >
              {links.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-line py-5 text-2xl font-medium tracking-[-0.02em] text-hi"
                  >
                    {link.label}
                    <ArrowUpRight className="size-5 text-faint" />
                  </a>
                </motion.li>
              ))}
            </motion.ul>
            <div className="mt-10 px-6">
              <Button asChild variant="primary" size="lg" className="w-full">
                <Link href="/brief">Start Mission</Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
