"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function CopyLink({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your verification link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0B] px-6 text-[15px] font-semibold text-[#0B0B0B] transition-colors hover:bg-[#0B0B0B] hover:text-white focus-visible:ring-2 focus-visible:ring-[#0B0B0B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] focus-visible:outline-none",
        className,
      )}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Link copied" : "Copy verification link"}</span>
    </button>
  );
}
