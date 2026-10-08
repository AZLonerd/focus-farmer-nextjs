import type { SupabaseClient } from "@supabase/supabase-js";
import type { Focus, Pet } from "./types";

/** Loads the three independent parts of a user's saved farm concurrently. */
export async function loadFarm(client: SupabaseClient, userId: string) {
  const [progress, session, pets] = await Promise.all([
    client
      .from("progress")
      .select("coins,sessions")
      .eq("user_id", userId)
      .single(),
    client
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("claimed_at", null)
      .maybeSingle(),
    client
      .from("pets")
      .select("id,name,rarity,asset_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  for (const result of [progress, session, pets]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    progress: progress.data as { coins: number; sessions: number },
    session: session.data as Focus | null,
    pets: pets.data as Pet[],
  };
}

/** Reads the authoritative balance after a reward transaction. */
export async function loadProgress(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("progress")
    .select("coins,sessions")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data as { coins: number; sessions: number };
}

/** Calls a transactional database function and rejects failed or empty results. */
export async function runTransaction<T>(
  client: SupabaseClient,
  name: "start_focus" | "reap_focus" | "pull_egg",
  args?: Record<string, string | number>,
): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data == null)
    throw new Error("The farm returned no result. Please try again.");
  return data as T;
}
