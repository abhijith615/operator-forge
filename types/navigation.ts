import type { LucideIcon } from "lucide-react";

export type NavAvailability =
  /** Usable right now, before the shift starts. */
  | "open"
  /** Comes online the moment the mission clock starts. */
  | "in-mission"
  /** Written after the shift ends. */
  | "post-mission";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  availability: NavAvailability;
  /** Single-key jump target, chorded from `G`. */
  shortcut?: string;
  description: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}
