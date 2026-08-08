"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Lock, LogOut, PanelLeft, Search } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { clearOperatorScope } from "@/components/shell/operator-scope";
import { signOut } from "@/lib/auth/actions";
import { navSections } from "@/lib/constants/navigation";
import { useShellStore } from "@/stores/shell-store";
import { cn } from "@/lib/utils";

const itemClass = cn(
  "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13.5px] text-mid",
  "transition-colors duration-100 outline-none select-none",
  "data-[selected=true]:bg-white/[0.07] data-[selected=true]:text-hi",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-lo",
);

/**
 * Substring ranking rather than cmdk's fuzzy default. For a palette whose job
 * is jumping to a named panel, "genom" must land on Genome and nowhere else.
 */
function scoreCommand(value: string, search: string, keywords?: string[]): number {
  const query = search.trim().toLowerCase();
  if (!query) return 1;

  const label = value.toLowerCase();
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 0.75;

  const context = (keywords ?? []).join(" ").toLowerCase();
  return context.includes(query) ? 0.4 : 0;
}

export function CommandMenu() {
  const router = useRouter();
  const open = useShellStore((state) => state.commandOpen);
  const setOpen = useShellStore((state) => state.setCommandOpen);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);

  const [search, setSearch] = React.useState("");

  // A palette that remembers your last query is a palette you have to clear.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setSearch("");
    },
    [setOpen],
  );

  const run = React.useCallback(
    (action: () => void) => {
      handleOpenChange(false);
      // Let the dialog close before the route change so the exit animation runs.
      window.setTimeout(action, 90);
    },
    [handleOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        className="top-[18%] max-w-xl translate-y-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command
          loop
          filter={scoreCommand}
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-faint [&_[cmdk-group-heading]]:uppercase"
        >
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-lo" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Jump to a panel or run a command…"
              className="h-13 w-full bg-transparent text-[14.5px] text-hi outline-none placeholder:text-faint"
            />
            <Kbd>ESC</Kbd>
          </div>

          <Command.List className="max-h-[22rem] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-10 text-center text-[13px] text-lo">
              Nothing matches that.
            </Command.Empty>

            {navSections.map((section) => (
              <Command.Group key={section.id} heading={section.label}>
                {section.items.map((item) => (
                  <Command.Item
                    key={item.href}
                    // Score on the label alone; the description is searchable
                    // but must not dilute an exact panel-name match.
                    value={item.label}
                    keywords={[item.description, section.label]}
                    onSelect={() => run(() => router.push(item.href))}
                    className={itemClass}
                  >
                    <item.icon />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.availability !== "open" ? (
                      <Lock className="size-3! text-faint!" />
                    ) : null}
                    {item.shortcut ? (
                      <span className="flex items-center gap-1">
                        <Kbd>G</Kbd>
                        <Kbd>{item.shortcut}</Kbd>
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            <Command.Group heading="Shell">
              <Command.Item
                value="toggle sidebar collapse"
                onSelect={() => run(toggleSidebar)}
                className={itemClass}
              >
                <PanelLeft />
                <span className="flex-1">Toggle sidebar</span>
                <Kbd>[</Kbd>
              </Command.Item>
              <Command.Item
                value="sign out log out"
                onSelect={() =>
                  run(() => {
                    clearOperatorScope();
                    void signOut();
                  })
                }
                className={itemClass}
              >
                <LogOut />
                <span className="flex-1">Sign out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
