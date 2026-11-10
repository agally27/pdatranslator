import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryView } from "@/components/app/history";

export const metadata: Metadata = { title: "Translation History" };

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryView />
    </Suspense>
  );
}
