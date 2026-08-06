"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTerm } from "@/lib/mission/glossary";
import { cn } from "@/lib/utils";

interface TermProps {
  /** Key into the glossary, e.g. `otif`. */
  id: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * An unfamiliar word, made answerable. Hover gives the one-liner, click opens
 * the full explanation — nobody has to bluff their way past a term.
 */
export function Term({ id, children, className }: TermProps) {
  const [open, setOpen] = React.useState(false);
  const term = getTerm(id);

  if (!term) return <>{children ?? id}</>;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "cursor-help rounded-sm underline decoration-dotted decoration-from-font underline-offset-[3px]",
              "decoration-ember-500/60 transition-colors duration-150",
              "hover:text-ember-400 hover:decoration-ember-500",
              className,
            )}
          >
            {children ?? term.term}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 font-normal">
          <span className="block text-[12px] leading-relaxed text-mid">
            {term.short}
          </span>
          <span className="mt-1 block text-[10.5px] tracking-[0.1em] text-faint uppercase">
            Click to read more
          </span>
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-ember-500">
              <BookOpen className="size-3.5" />
              <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase">
                Operations vocabulary
              </span>
            </div>
            <DialogTitle className="mt-2 text-[24px] tracking-[-0.03em]">
              {term.term}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-hi">
              {term.short}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-5">
            <Block label="What it means" body={term.explanation} />
            <Block label="On this floor, right now" body={term.example} accent />
            <Block label="Why it matters beyond today" body={term.realWorld} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Block({
  label,
  body,
  accent = false,
}: {
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-4",
        accent
          ? "border-ember-500/20 bg-ember-500/[0.05]"
          : "border-line bg-white/[0.02]",
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] tracking-[0.14em] uppercase",
          accent ? "text-ember-500" : "text-faint",
        )}
      >
        {label}
      </p>
      <p className="mt-2.5 text-[14px] leading-relaxed text-mid">{body}</p>
    </div>
  );
}
