"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/** One question: a real button that opens its answer, announced with aria-expanded. */
export function FaqItem({ id, question, answer, open, onToggle }: { id: string; question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#E6E4DD]">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left text-[18px] leading-snug font-semibold tracking-[-0.015em] text-[#111111] focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAFAF7] focus-visible:outline-none md:text-[19px]"
        >
          {question}
          <Plus aria-hidden className={cn("size-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none", open && "rotate-45")} />
        </button>
      </h3>
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open}>
        <p className="max-w-3xl pb-6 text-[16px] leading-relaxed text-[#5C5C57] md:text-[17px]">{answer}</p>
      </div>
    </div>
  );
}

/** The accordion. The first question starts open; any number can be open at once. */
export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = React.useState<Set<number>>(() => new Set([0]));
  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="border-t border-[#E6E4DD]">
      {items.map((item, index) => (
        <FaqItem key={item.q} id={`faq-${index}`} question={item.q} answer={item.a} open={open.has(index)} onToggle={() => toggle(index)} />
      ))}
    </div>
  );
}
