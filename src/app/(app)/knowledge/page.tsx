import type { Metadata } from "next";
import { KnowledgeHub } from "@/components/app/knowledge-hub";

export const metadata: Metadata = { title: "PDA Knowledge Hub" };

export default function KnowledgePage() {
  return <KnowledgeHub />;
}
