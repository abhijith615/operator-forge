export const PRIVACY_ROUTE = "/privacy";
export const TERMS_ROUTE = "/terms";

/** Shown on both documents. Change it whenever either one changes. */
export const LEGAL_UPDATED = "25 September 2026";

export const LEGAL_LINKS = [
  { label: "Privacy Policy", href: PRIVACY_ROUTE },
  { label: "Terms & Conditions", href: TERMS_ROUTE },
] as const;
