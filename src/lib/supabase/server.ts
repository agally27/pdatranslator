import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicConfig, serverConfig } from "@/lib/config";

/** Server Supabase client bound to the request cookies (acts as the signed-in user; RLS applies). */
export async function getServerSupabase(): Promise<SupabaseClient> {
  if (!publicConfig.supabaseConfigured) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createServerClient(publicConfig.supabaseUrl!, publicConfig.supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a context where cookies are read-only; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS – server only, used solely for account
 * deletion. Never import this from client components.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const key = serverConfig().supabaseServiceRoleKey;
  if (!publicConfig.supabaseConfigured || !key) return null;
  return createClient(publicConfig.supabaseUrl!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
