import type { Outfit } from "./types";

/** Local preferences are cosmetic; database data remains authoritative for rewards. */
export interface Preferences {
  outfit: Outfit;
  muted: boolean;
  /** Audio volume in the inclusive range 0–1. */
  volume: number;
}

export const defaultPreferences: Preferences = {
  outfit: "blue",
  muted: false,
  volume: 0.5,
};
type StorageKey = "prefs" | "breakEndsAt" | "walkthrough";

/** Reads user-scoped settings; unavailable storage behaves like an empty store. */
export function readSetting(userId: string, key: StorageKey): string | null {
  try {
    return localStorage.getItem(`focus-farmer:${userId}:${key}`);
  } catch {
    return null;
  }
}

/** Writes or removes a setting without interrupting play in restricted browsers. */
export function writeSetting(
  userId: string,
  key: StorageKey,
  value: string | null,
) {
  try {
    const name = `focus-farmer:${userId}:${key}`;
    if (value === null) localStorage.removeItem(name);
    else localStorage.setItem(name, value);
  } catch {
    /* Saving preferences is best-effort when browser storage is disabled. */
  }
}

/** Validates persisted JSON before it is applied to state or an HTML audio element. */
export function readPreferences(userId: string): Preferences {
  try {
    const value: unknown = JSON.parse(readSetting(userId, "prefs") || "{}");
    if (!value || typeof value !== "object") return { ...defaultPreferences };
    const prefs = value as Record<string, unknown>;
    return {
      outfit:
        prefs.outfit === "blue" ||
        prefs.outfit === "green" ||
        prefs.outfit === "red"
          ? prefs.outfit
          : defaultPreferences.outfit,
      muted:
        typeof prefs.muted === "boolean"
          ? prefs.muted
          : defaultPreferences.muted,
      volume:
        typeof prefs.volume === "number" && Number.isFinite(prefs.volume)
          ? Math.min(1, Math.max(0, prefs.volume))
          : defaultPreferences.volume,
    };
  } catch {
    return { ...defaultPreferences };
  }
}
