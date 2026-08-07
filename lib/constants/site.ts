export const site = {
  name: "Operator Forge",
  wordmark: "OPERATOR FORGE",
  tagline: "The Flight Simulator for Future Operators.",
  description:
    "Operator Forge drops you into your first day running a real business. Thirty minutes, more work than you can finish, and three colleagues who answer back in real time.",
  /**
   * Only read server-side, for `metadataBase` and Open Graph tags. Falls back
   * to the Vercel deployment URL so a preview or a production build without
   * `NEXT_PUBLIC_SITE_URL` does not advertise itself as localhost.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
} as const;

export const capabilities = [
  { id: "curiosity", name: "Curiosity", blurb: "You ask before you assume." },
  { id: "decision-making", name: "Decision Making", blurb: "You commit under incomplete information." },
  { id: "systems-thinking", name: "Systems Thinking", blurb: "You see the second-order effect." },
  { id: "prioritization", name: "Prioritization", blurb: "You know what can wait." },
  { id: "learning-agility", name: "Learning Agility", blurb: "You update fast when the floor tells you something new." },
  { id: "ownership", name: "Ownership", blurb: "You close the loop without being asked." },
  { id: "ai-collaboration", name: "AI Collaboration", blurb: "You direct the machine instead of accepting it." },
  { id: "customer-thinking", name: "Customer Thinking", blurb: "You can name who is hurt by the delay." },
  { id: "communication", name: "Communication", blurb: "You are understood the first time." },
  { id: "stress-handling", name: "Stress Handling", blurb: "Your judgement holds at minute fifty." },
] as const;

export type CapabilityId = (typeof capabilities)[number]["id"];
