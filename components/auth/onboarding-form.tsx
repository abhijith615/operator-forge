"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Phone, TriangleAlert, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/auth/form-state";
import { easing } from "@/lib/motion";

interface OnboardingFormProps {
  defaultName: string;
  defaultWhatsapp: string;
  email: string;
}

export function OnboardingForm({
  defaultName,
  defaultWhatsapp,
  email,
}: OnboardingFormProps) {
  const [state, formAction, pending] = React.useActionState(
    completeOnboarding,
    idleFormState,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: easing.outExpo }}
    >
      <p className="font-mono text-[10.5px] tracking-[0.2em] text-ember-500 uppercase">
        Shift roster
      </p>
      <h2 className="mt-4 text-[27px] leading-tight font-semibold tracking-[-0.03em] text-hi">
        Two details, then the floor.
      </h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-mid">
        Signed in as <span className="text-hi">{email}</span>. Your WhatsApp is
        how the hub reaches you — the mission opens with a message on it.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaultName}
            autoComplete="name"
            placeholder="Ananya Rao"
            required
            disabled={pending}
            invalid={Boolean(state.fieldErrors?.fullName)}
            adornment={<UserRound />}
          />
          {state.fieldErrors?.fullName ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-alert-500">
              <TriangleAlert className="size-3.5" />
              {state.fieldErrors.fullName}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            defaultValue={defaultWhatsapp}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            required
            disabled={pending}
            invalid={Boolean(state.fieldErrors?.whatsapp)}
            adornment={<Phone />}
          />
          {state.fieldErrors?.whatsapp ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-alert-500">
              <TriangleAlert className="size-3.5" />
              {state.fieldErrors.whatsapp}
            </p>
          ) : (
            <p className="text-[12px] text-faint">
              Include your country code. We only message you about a mission.
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          className="w-full rounded-xl"
        >
          Enter the hub
          <ArrowRight className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1" />
        </Button>

        {state.status === "error" && !state.fieldErrors ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-alert-500">
            <TriangleAlert className="size-3.5" />
            {state.message}
          </p>
        ) : null}
      </form>
    </motion.div>
  );
}
