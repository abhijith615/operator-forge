"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ComposerProps {
  placeholder: string;
  disabled?: boolean;
  suggestions?: readonly string[];
  onSend: (value: string) => void;
}

/** Grows with the message, sends on Enter, never blocks the floor behind it. */
export function Composer({
  placeholder,
  disabled = false,
  suggestions = [],
  onSend,
}: ComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(180, node.scrollHeight)}px`;
  }, []);

  React.useEffect(resize, [value, resize]);

  function submit(next = value) {
    const trimmed = next.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSend(trimmed);
    requestAnimationFrame(resize);
  }

  return (
    <div className="shrink-0 border-t border-line bg-obsidian/60 p-3 backdrop-blur-sm">
      {suggestions.length > 0 && value.length === 0 ? (
        <div className="mask-fade-x mb-2.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: easing.outExpo }}
              onClick={() => submit(suggestion)}
              disabled={disabled}
              className={cn(
                "shrink-0 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-mid",
                "transition-colors duration-150 hover:border-line-strong hover:bg-white/[0.05] hover:text-hi",
                "disabled:pointer-events-none disabled:opacity-45",
              )}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-line-strong bg-white/[0.025] p-2 pl-3.5",
          "transition-[border-color,box-shadow] duration-200",
          "focus-within:border-ember-500/50 focus-within:shadow-[0_0_0_3px_rgba(245,196,0,0.1)]",
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className={cn(
            "min-h-[1.75rem] flex-1 resize-none bg-transparent py-1 text-[14.5px] leading-relaxed",
            "text-hi outline-none placeholder:text-faint disabled:opacity-50",
          )}
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={disabled || value.trim().length === 0}
          aria-label="Send"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full transition-all duration-200",
            value.trim().length > 0 && !disabled
              ? "bg-ember-500 text-white hover:brightness-110"
              : "bg-white/[0.06] text-faint",
            "disabled:cursor-not-allowed",
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
