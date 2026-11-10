import { Eye, Feather, Handshake, Laugh, ShieldCheck, Sprout, type LucideIcon } from "lucide-react";
import type { DemandLevel, StyleId } from "@/lib/types";

export const STYLE_VISUAL: Record<StyleId, { icon: LucideIcon; chip: string; border: string }> = {
  descriptive: { icon: Eye, chip: "bg-sage-100 text-sage-800", border: "border-l-sage-400" },
  collaborative: { icon: Handshake, chip: "bg-sky-soft-100 text-sky-soft-600", border: "border-l-sky-soft-600/60" },
  autonomy: { icon: Sprout, chip: "bg-clay-100 text-clay-600", border: "border-l-clay-600/60" },
  playful: { icon: Laugh, chip: "bg-amber-soft-100 text-amber-soft-600", border: "border-l-amber-soft-600/60" },
  reassuring: { icon: ShieldCheck, chip: "bg-lilac-100 text-lilac-600", border: "border-l-lilac-600/60" },
  minimal: { icon: Feather, chip: "bg-ink-100 text-ink-700", border: "border-l-ink-300" },
};

export const LEVEL_VISUAL: Record<DemandLevel, { label: string; tone: "sage" | "amber" | "rose"; position: string }> = {
  low: { label: "Low potential demand", tone: "sage", position: "16%" },
  moderate: { label: "Moderate potential demand", tone: "amber", position: "50%" },
  high: { label: "High potential demand", tone: "rose", position: "84%" },
};
