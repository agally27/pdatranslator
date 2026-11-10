import type { Metadata } from "next";
import { Profiles } from "@/components/profiles/profiles";

export const metadata: Metadata = { title: "My Child Profiles" };

export default function ProfilesPage() {
  return <Profiles />;
}
