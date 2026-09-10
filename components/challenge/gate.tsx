"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  register,
  validate,
  type FieldErrors,
  type Participant,
} from "@/lib/challenge/participant";
import { logEvent } from "@/lib/challenge/telemetry";
import { easing } from "@/lib/motion";

/**
 * The door into Day 1.
 *
 * Three fields and straight in — no email round trip. The copy says so
 * plainly, because calling a lead-capture form "verification" is the kind of
 * thing people notice and then stop trusting the rest of the page.
 */
export function Gate({ onEnter }: { onEnter: (participant: Participant) => void }) {
  const reduced = useReducedMotion();
  const [values, setValues] = React.useState({ fullName: "", email: "", phone: "" });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, setPending] = React.useState(false);

  const fields = [
    {
      id: "fullName" as const,
      label: "Your name",
      type: "text",
      placeholder: "Ananya Rao",
      autoComplete: "name",
      inputMode: undefined,
    },
    {
      id: "email" as const,
      label: "Email",
      type: "email",
      placeholder: "you@example.com",
      autoComplete: "email",
      inputMode: "email" as const,
    },
    {
      id: "phone" as const,
      label: "Mobile number",
      type: "tel",
      placeholder: "98765 43210",
      autoComplete: "tel",
      inputMode: "tel" as const,
    },
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.getElementById(Object.keys(found)[0]!);
      first?.focus();
      return;
    }

    setPending(true);
    logEvent("simulation_started", { gate: "submitted" });
    const participant = await register(values);
    onEnter(participant);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-void px-5 py-14">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing.outExpo }}
        className="w-full max-w-md"
      >
        <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
          Day 1 · The 180-Second Shift
        </p>
        <h1 className="mt-3 text-[27px] leading-tight font-semibold tracking-[-0.03em] text-hi">
          Before you take the floor.
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mid">
          Fifteen minutes, one dark store, and a scorecard at the end that is
          yours to keep. We need somewhere to send it.
        </p>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                name={field.id}
                type={field.type}
                inputMode={field.inputMode}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                value={values[field.id]}
                aria-invalid={Boolean(errors[field.id])}
                aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
                onChange={(event) => {
                  setValues((prev) => ({ ...prev, [field.id]: event.target.value }));
                  if (errors[field.id]) {
                    setErrors((prev) => ({ ...prev, [field.id]: undefined }));
                  }
                }}
                className="mt-1.5"
              />
              {errors[field.id] ? (
                <p id={`${field.id}-error`} className="mt-1.5 text-[12px] text-alert-500">
                  {errors[field.id]}
                </p>
              ) : null}
            </div>
          ))}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Opening the store" : "Take the floor"}
            {pending ? null : <ArrowRight />}
          </Button>
        </form>

        <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
          We use these to send your scorecard and to tell you when Day 2 opens.
          Nothing is verified by email, so this is not an account — it is how we
          reach you. Your number is never shown to anyone else who plays.
        </p>
      </motion.div>
    </div>
  );
}
