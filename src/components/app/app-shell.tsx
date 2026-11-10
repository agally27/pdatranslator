"use client";

import { LogOut, Menu, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Brand } from "@/components/app/brand";
import { ChildSwitcher } from "@/components/app/child-switcher";
import { MOBILE_PRIMARY, NAV_ITEMS } from "@/components/app/nav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth-context";
import { AppDataProvider, useAppData } from "@/lib/data/app-data";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ShellSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-5 py-10" aria-busy="true" aria-label="Loading your information">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function ModeBanner() {
  const { client, config } = useAppData();
  if (!config) return null;
  const parts: string[] = [];
  if (client.mode === "demo") parts.push("Demo mode – your information is stored only in this browser.");
  if (!config.ai.live) parts.push("AI responses are examples from the built-in demo engine, not a live AI model.");
  if (config.ai.misconfigured) parts.push(`AI_PROVIDER is set to “${config.ai.misconfigured}” but its API key is missing.`);
  if (parts.length === 0) return null;
  return (
    <div className="border-b border-amber-soft-600/20 bg-amber-soft-100 px-5 py-2 text-center text-xs leading-relaxed text-amber-soft-600" role="note">
      {parts.join(" ")}
    </div>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const auth = useAuth();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className={cn("justify-start", className)}
      onClick={async () => {
        await auth.signOut();
        router.replace("/login");
      }}
    >
      <LogOut aria-hidden /> {auth.user?.isDemo ? "Leave demo" : "Sign out"}
    </Button>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-cream-50/90 px-4 py-6 backdrop-blur lg:flex">
      <Link href="/dashboard" className="px-2" aria-label="PDA Companion dashboard"><Brand /></Link>
      <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors",
                active ? "bg-sage-100 text-sage-800" : "text-ink-700 hover:bg-sage-50",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-sage-700" : "text-ink-500")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <SignOutButton className="w-full" />
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.href));
  const more = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY.includes(item.href));
  const moreActive = more.some((item) => isActive(pathname, item.href));
  const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium";

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-cream-50/95 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {primary.map(({ href, shortLabel, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-sage-700" : "text-ink-500")}>
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-sage-100")}><Icon className="size-5" aria-hidden /></span>
              {shortLabel}
            </Link>
          );
        })}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(tab, moreActive ? "text-sage-700" : "text-ink-500")} aria-label="More pages">
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-sage-100")}><Menu className="size-5" aria-hidden /></span>
            More
          </DialogTrigger>
          <DialogContent title="More">
            <div className="flex flex-col gap-1">
              {more.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-medium text-ink-900 hover:bg-sage-100">
                  <Icon className="size-5 text-sage-700" aria-hidden /> {label}
                </Link>
              ))}
              <div className="my-1 h-px bg-ink-100" />
              <SignOutButton className="h-12 px-3 text-base" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar />
      <ModeBanner />
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-ink-100/70 bg-cream-50/85 px-4 backdrop-blur sm:px-6 lg:px-10">
        <Link href="/dashboard" className="lg:hidden" aria-label="PDA Companion dashboard"><Brand /></Link>
        <span className="hidden text-sm text-ink-500 lg:block">Communication. Understanding. Connection.</span>
        <ChildSwitcher className="min-w-0 max-w-[40vw] sm:max-w-xs" />
      </div>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}

/** Auth guard + data loading + navigation chrome for every signed-in page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!auth.loading && !auth.user) router.replace("/login");
  }, [auth.loading, auth.user, router]);

  if (auth.loading || !auth.user) return <ShellSkeleton />;

  return (
    <AppDataProvider
      fallback={<ShellSkeleton />}
      errorFallback={(message, retry) => (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center" role="alert">
          <h1 className="text-2xl font-semibold">We hit a problem</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{message}</p>
          <Button className="mt-6" onClick={retry}><RefreshCw aria-hidden /> Try again</Button>
        </div>
      )}
    >
      <Frame>{children}</Frame>
    </AppDataProvider>
  );
}
