"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center" role="alert">
      <h1 className="text-3xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-2 text-ink-500">Sorry about that. Nothing you entered has been lost from your account. Please try again.</p>
      <Button className="mt-6" onClick={reset}><RefreshCw aria-hidden /> Try again</Button>
    </main>
  );
}
