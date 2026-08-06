/** The person in the chair. */
export interface Operator {
  id: string;
  email: string;
  fullName: string;
  whatsapp: string | null;
  avatarUrl: string | null;
  /** True once name + WhatsApp have been captured. Gates entry to the shell. */
  onboarded: boolean;
  createdAt: string;
}

export type AuthProvider = "google" | "magic-link" | "simulator";

export interface AuthSession {
  operator: Operator;
  provider: AuthProvider;
}

/** Discriminated result for every server action in the auth flow. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
