"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn("inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-ink-200 transition-colors data-[state=checked]:bg-sage-600 disabled:opacity-50", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5.5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";
