import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function getServerErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

/** Authenticates the cookie session before creating a privileged DB client. */
export async function getJobApplicationClients() {
  const authClient = await createClient();
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Job tracking needs SUPABASE_SERVICE_ROLE_KEY configured on the server.");
  return {
    userId: data.user.id,
    db: createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}
