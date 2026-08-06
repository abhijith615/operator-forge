"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import "highlight.js/styles/github-dark.css";

/**
 * Markdown for agent replies. Tables and code blocks matter here — the copilot
 * is expected to lay out a comparison or show its arithmetic.
 */
export const Markdown = React.memo(function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("of-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ children: content, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ember-400 underline underline-offset-2 hover:text-ember-200"
            >
              {content}
            </a>
          ),
          table: ({ children: content }) => (
            <div className="my-3 overflow-x-auto rounded-card border border-line">
              <table className="w-full border-collapse text-[12.5px]">{content}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
