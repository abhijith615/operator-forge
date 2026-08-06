import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { PageHeader, PageShell } from "@/components/shell/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { IdentityForm } from "@/features/settings/components/identity-form";
import { MotionStatus } from "@/features/settings/components/motion-status";
import { SoundToggle } from "@/features/settings/components/sound-toggle";
import { signOut } from "@/lib/auth/actions";
import { requireOperator } from "@/lib/auth/session";
import { flatNavItems } from "@/lib/constants/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Settings",
  description: "Identity, shortcuts and motion preferences.",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="grid gap-6 border-t border-line py-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h3 className="text-[15px] font-medium tracking-[-0.01em] text-hi">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-lo">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Reveal>
  );
}

export default async function SettingsPage() {
  const operator = await requireOperator();

  const shortcuts = [
    { keys: ["⌘", "K"], label: "Open the command menu" },
    { keys: ["["], label: "Collapse or expand the sidebar" },
    ...flatNavItems
      .filter((item) => item.shortcut)
      .map((item) => ({ keys: ["G", item.shortcut ?? ""], label: `Go to ${item.label}` })),
  ];

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Operator"
        title="Settings"
        description="Your identity on the roster, how the shell responds to you, and how to leave."
      />

      <div className="mt-8">
        <Section
          title="Identity"
          description="How the hub addresses you, and how it reaches you before a shift."
        >
          <IdentityForm
            defaultName={operator.fullName}
            defaultWhatsapp={operator.whatsapp ?? ""}
          />
          <p className="mt-4 text-[12.5px] text-lo">
            Signed in as <span className="text-mid">{operator.email}</span> ·{" "}
            {isSupabaseConfigured ? "Supabase session" : "Simulator Mode (local only)"}
          </p>
        </Section>

        <Section
          title="Keyboard"
          description="The shell is built to be driven without a mouse. Chords follow the G-then-key pattern."
        >
          <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.label}
                className="flex items-center justify-between gap-4 bg-surface px-4 py-3"
              >
                <span className="text-[13px] text-mid">{shortcut.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {/* Indexed: a chord may repeat a key, as "G then G" does. */}
                  {shortcut.keys.map((key, index) => (
                    <Kbd key={`${key}-${index}`}>{key}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Appearance"
          description="Operator Forge is a dark instrument by design — a hub floor at 6am is not a bright room."
        >
          <div className="space-y-3">
            <MotionStatus />
            <SoundToggle />
          </div>
        </Section>

        <Section
          title="Session"
          description="Signing out does not delete your mission record."
        >
          <form action={signOut}>
            <Button type="submit" variant="danger" size="md">
              <LogOut />
              Sign out
            </Button>
          </form>
        </Section>
      </div>
    </PageShell>
  );
}
