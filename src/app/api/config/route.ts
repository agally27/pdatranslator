import { NextResponse } from "next/server";
import { configStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Non-secret feature status used by the UI to label demo vs live behaviour. */
export async function GET() {
  return NextResponse.json(configStatus());
}
