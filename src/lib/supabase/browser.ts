"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/config";

let client: SupabaseClient | null = null;

/** Browser Supabase client (anon key + the user's session; all access is governed by RLS). */
export function getBrowserSupabase(): SupabaseClient {
  if (!publicConfig.supabaseConfigured) throw new Error("Supabase is not configured.");
  client ??= createBrowserClient(publicConfig.supabaseUrl!, publicConfig.supabaseAnonKey!);
  return client;
}
