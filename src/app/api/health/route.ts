import { NextResponse } from "next/server";
import { configStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Liveness + configuration summary. Contains no secrets and no user data. */
export async function GET() {
  const status = configStatus();
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    dataMode: status.dataMode,
    aiProvider: status.ai.provider,
    aiLive: status.ai.live,
    transcriptionLive: status.transcription.live,
  });
}
