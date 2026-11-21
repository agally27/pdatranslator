import type { Metadata } from "next";
import { Suspense } from "react";
import { Translator } from "@/components/translator/translator";

export const metadata: Metadata = { title: "PDA Translator" };

export default function TranslatorPage() {
  return (
    <Suspense fallback={null}>
      <Translator />
    </Suspense>
  );
}
