import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3", {
  variants: {
    tone: {
      sage: "bg-sage-100 text-sage-800",
      neutral: "bg-ink-100 text-ink-700",
      clay: "bg-clay-100 text-clay-600",
      sky: "bg-sky-soft-100 text-sky-soft-600",
      amber: "bg-amber-soft-100 text-amber-soft-600",
      lilac: "bg-lilac-100 text-lilac-600",
      rose: "bg-rose-soft-100 text-rose-soft-600",
      outline: "border border-ink-200 text-ink-700",
    },
  },
  defaultVariants: { tone: "sage" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
