import { cn } from "@/lib/utils";

/** Temporary text-based brand mark. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap", className)}>
      <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-sage-400 to-sage-600 font-display text-base font-semibold text-white shadow-sm">
        p
      </span>
      {compact ? null : (
        <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
          PDA <span className="text-sage-600">Companion</span>
        </span>
      )}
    </span>
  );
}

export const TAGLINE = "Communication. Understanding. Connection.";
