import type { Metadata } from "next";
import { Specialist } from "@/components/specialist/specialist";

export const metadata: Metadata = { title: "PDA Specialist" };

export default function SpecialistPage() {
  return <Specialist />;
}
