/** Sprite colors supported by both the database and the public asset set. */
export type Outfit = "blue" | "green" | "red";
export type FocusMode = "regular" | "hard";
export type DisplayMode = "down" | "up";
export type Rarity = "common" | "rare" | "epic" | "legendary";
/** Screens are local navigation state; sessions themselves persist in Supabase. */
export type Screen =
  | "landing"
  | "login"
  | "signup"
  | "welcome"
  | "setup"
  | "focus"
  | "summary"
  | "rest"
  | "collection";
/** Database session snapshot. Reward fields are null until a REAP transaction. */
export type Focus = {
  id: string;
  /** ISO timestamp supplied by the database. */
  started_at: string;
  /** Absolute deadline used to recover the timer after a refresh. */
  ends_at: string;
  minutes: number;
  mode: FocusMode;
  display_mode: DisplayMode;
  outfit: Outfit;
  /** Null identifies the user's one open session. */
  claimed_at: string | null;
  completed: boolean | null;
  base_coins: number | null;
  hard_bonus: number | null;
  lucky_bonus: number | null;
  /** Total coins granted by the database, including both bonuses. */
  earned: number | null;
};
/** One hatch, including duplicates; asset_id maps to a public image filename. */
export type Pet = {
  id: string;
  name: string;
  rarity: Rarity;
  asset_id: string;
};
