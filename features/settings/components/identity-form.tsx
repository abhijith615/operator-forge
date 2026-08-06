"use client";

import * as React from "react";
import { CheckCircle2, Phone, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/auth/form-state";

interface IdentityFormProps {
  defaultName: string;
  defaultWhatsapp: string;
}

export function IdentityForm({ defaultName, defaultWhatsapp }: IdentityFormProps) {
  const [state, formAction, pending] = React.useActionState(
    updateProfile,
    idleFormState,
  );

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message, { icon: <CheckCircle2 className="size-4" /> });
    }
  }, [state]);

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="settings-name">Full name</Label>
        <Input
          id="settings-name"
          name="fullName"
          defaultValue={defaultName}
          autoComplete="name"
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
        <Label htmlFor="settings-whatsapp">WhatsApp number</Label>
        <Input
          id="settings-whatsapp"
          name="whatsapp"
          type="tel"
          defaultValue={defaultWhatsapp}
          autoComplete="tel"
          inputMode="tel"
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
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" size="md" loading={pending}>
          Save changes
        </Button>
        {state.status === "error" && !state.fieldErrors ? (
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-alert-500">
            <TriangleAlert className="size-3.5" />
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
