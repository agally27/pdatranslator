import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, assertSameOrigin, enforceRateLimit, parseJsonBody, requireUser, withApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ confirm: z.literal("DELETE") });

/**
 * POST /api/account/delete – permanently deletes the signed-in user's account.
 * Deleting the auth user cascades to every personal table (ON DELETE CASCADE).
 * Requires SUPABASE_SERVICE_ROLE_KEY; the key never leaves the server.
 */
export const POST = withApi("account.delete", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser(request);
  enforceRateLimit(user, "account", 5);
  await parseJsonBody(request, BodySchema);

  if (user.isDemo) {
    // Demo data lives only in the browser; the client clears it.
    return NextResponse.json({ deleted: true, mode: "demo" });
  }
  const admin = getServiceSupabase();
  if (!admin) {
    throw new ApiError(503, "not_configured", "Account deletion is not configured yet. Your data has been removed, but the site owner needs to set SUPABASE_SERVICE_ROLE_KEY to remove the login itself.");
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logger.error("account.delete_failed", { status: error.status });
    throw new ApiError(502, "delete_failed", "We could not delete the account just now. Please try again.");
  }
  return NextResponse.json({ deleted: true, mode: "supabase" });
});
