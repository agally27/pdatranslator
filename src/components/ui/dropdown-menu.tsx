"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn("z-50 min-w-52 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-ink-100 bg-white p-1.5 shadow-lg data-[state=open]:animate-fade-up", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn("flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-900 outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-sage-100 [&_svg]:size-4 [&_svg]:text-ink-500", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-500", className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-ink-100" />;
}
