import { BookOpen, History, LayoutDashboard, Languages, MessageCircleHeart, Settings, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/translator", label: "PDA Translator", shortLabel: "Translator", icon: Languages },
  { href: "/specialist", label: "PDA Specialist", shortLabel: "Specialist", icon: MessageCircleHeart },
  { href: "/profiles", label: "My Child Profiles", shortLabel: "Profiles", icon: Users },
  { href: "/history", label: "Translation History", shortLabel: "History", icon: History },
  { href: "/knowledge", label: "PDA Knowledge Hub", shortLabel: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

/** The four items shown directly in the mobile tab bar; the rest sit behind "More". */
export const MOBILE_PRIMARY = ["/dashboard", "/translator", "/specialist", "/history"];
