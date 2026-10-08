import { createBrowserClient } from "@supabase/ssr";

/** Creates the browser client; placeholders allow the unconfigured title screen to render. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "unconfigured",
  );
}
