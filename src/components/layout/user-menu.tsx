"use client";

import Link from "next/link";
import { LogOut, LogOutIcon, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";

export function UserMenu() {
  const { user, logout, logoutAll } = useAuth();
  const name = user?.name || user?.email || "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Account menu"><Avatar name={name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/profile"><UserRound /> Profile</Link></DropdownMenuItem>
        <DropdownMenuLabel>Session</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => logout().catch(() => toast.error("Signed out locally; the server could not be reached."))}><LogOut /> Sign out</DropdownMenuItem>
        <DropdownMenuItem danger onSelect={() => logoutAll().catch(() => toast.error("Signed out locally; the server could not be reached."))}><LogOutIcon /> Sign out everywhere</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
