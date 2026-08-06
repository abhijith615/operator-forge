"use client";

import { ChevronsUpDown, LogOut, Settings, Trophy } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { initialsFrom } from "@/lib/utils";
import type { Operator } from "@/types/operator";

export function ProfileMenu({ operator }: { operator: Operator }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-8 items-center gap-2 rounded-full border border-transparent pr-1.5 pl-1 transition-colors duration-150 hover:border-line-strong hover:bg-white/[0.04]"
          aria-label="Operator menu"
        >
          <Avatar className="size-6.5">
            {operator.avatarUrl ? (
              <AvatarImage src={operator.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initialsFrom(operator.fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-[13px] text-mid group-hover:text-hi sm:block">
            {operator.fullName.split(" ")[0]}
          </span>
          <ChevronsUpDown className="size-3 text-faint" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar className="size-9">
            {operator.avatarUrl ? (
              <AvatarImage src={operator.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initialsFrom(operator.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-hi">
              {operator.fullName}
            </p>
            <p className="truncate text-[12px] text-lo">{operator.email}</p>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Operator</DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link href="/leaderboard">
            <Trophy />
            Standings
            <DropdownMenuShortcut>G L</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
            <DropdownMenuShortcut>G S</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-left">
              <LogOut />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
