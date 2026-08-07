import {
  Boxes,
  ClipboardList,
  Crosshair,
  Dna,
  MessagesSquare,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import type { NavSection } from "@/types/navigation";

export const navSections: NavSection[] = [
  {
    id: "shift",
    label: "Shift",
    items: [
      {
        label: "Mission",
        href: "/mission",
        icon: Crosshair,
        availability: "open",
        shortcut: "M",
        description: "Your briefing, the store you inherit, and the clock.",
      },
      {
        label: "AI Assistant",
        href: "/assistant",
        icon: Sparkles,
        availability: "in-mission",
        shortcut: "A",
        description: "An operations copilot that only knows what you tell it.",
      },
      {
        label: "Messages",
        href: "/messages",
        icon: MessagesSquare,
        availability: "in-mission",
        shortcut: "C",
        description: "Store Manager, Inventory Lead and the customer on the line.",
      },
    ],
  },
  {
    id: "floor",
    label: "Floor",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: Boxes,
        availability: "in-mission",
        shortcut: "I",
        description: "Stock on hand, shrinkage, and what the system thinks you have.",
      },
      {
        label: "Orders",
        href: "/orders",
        icon: ClipboardList,
        availability: "in-mission",
        shortcut: "O",
        description: "The live queue, promised times, and what is about to breach.",
      },
      {
        label: "People",
        href: "/people",
        icon: Users,
        availability: "in-mission",
        shortcut: "P",
        description: "Pickers, riders, attendance and who is actually on the floor.",
      },
      {
        label: "Customers",
        href: "/customers",
        icon: UserRound,
        availability: "in-mission",
        shortcut: "U",
        description: "Complaints, ratings, and the people behind the numbers.",
      },
    ],
  },
  {
    id: "record",
    label: "Record",
    items: [
      {
        label: "Genome",
        href: "/genome",
        icon: Dna,
        availability: "post-mission",
        shortcut: "G",
        description: "How you operated, across ten capabilities. Written after the shift.",
      },
      {
        label: "Leaderboard",
        href: "/leaderboard",
        icon: Trophy,
        availability: "post-mission",
        shortcut: "L",
        description: "Where you stand against operators who ran the same store.",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        availability: "open",
        shortcut: "S",
        description: "Identity, notifications and motion preferences.",
      },
    ],
  },
];

export const flatNavItems = navSections.flatMap((section) => section.items);
