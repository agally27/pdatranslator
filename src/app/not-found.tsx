import Link from "next/link";
import { Brand } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold text-ink-900">We couldn’t find that page</h1>
      <p className="mt-2 text-ink-500">It may have moved, or the link might be out of date.</p>
      <Button asChild className="mt-6"><Link href="/dashboard">Go to the dashboard</Link></Button>
    </main>
  );
}
