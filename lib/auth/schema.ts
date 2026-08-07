import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter the email you want the link sent to.")
  .email("That doesn't look like a working email.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "We need something to put on the shift roster.")
  .max(60, "Keep it under 60 characters.");

/**
 * WhatsApp is how the store reaches you. Stored as entered, minus formatting —
 * validated loosely because operators join from many countries.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()\-.]/g, ""))
  .refine((value) => /^\+?\d{8,15}$/.test(value), {
    message: "Include the country code, e.g. +91 98765 43210.",
  });

export const magicLinkSchema = z.object({ email: emailSchema });

export const onboardingSchema = z.object({
  fullName: fullNameSchema,
  whatsapp: whatsappSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
