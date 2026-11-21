"use client";

import { Check, ChevronDown, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAppData } from "@/lib/data/app-data";
import { cn } from "@/lib/utils";

export function childLabel(name: string | undefined): string {
  return name?.trim() || "Unnamed profile";
}

/** Chooses which child profile the translator and specialist use. */
export function ChildSwitcher({ className }: { className?: string }) {
  const { children, selectedChild, actions } = useAppData();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-ink-200 bg-white/80 pl-3 pr-2.5 text-sm font-medium text-ink-900 hover:border-sage-300", className)}
        aria-label={`Selected child profile: ${selectedChild ? childLabel(selectedChild.preferredName) : "none"}. Change profile`}
      >
        <UserRound className="size-4 shrink-0 text-sage-600" aria-hidden />
        <span className="truncate">{selectedChild ? childLabel(selectedChild.preferredName) : "No profile"}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-500" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Child profile</DropdownMenuLabel>
        {children.map((child) => (
          <DropdownMenuItem key={child.id} onSelect={() => void actions.updateSettings({ selectedChildProfileId: child.id })}>
            <span className="flex-1 truncate">{childLabel(child.preferredName)}</span>
            {selectedChild?.id === child.id ? <Check aria-label="Selected" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => void actions.updateSettings({ selectedChildProfileId: null })}>
          <span className="flex-1">No profile</span>
          {!selectedChild ? <Check aria-label="Selected" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profiles"><Plus /> Manage profiles</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
