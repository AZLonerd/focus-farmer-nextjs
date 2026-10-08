import assert from "node:assert/strict";
import { test } from "node:test";
import { asset, clock } from "../features/farm/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runTransaction } from "../features/farm/repository";
import {
  defaultPreferences,
  readPreferences,
  readSetting,
  writeSetting,
} from "../features/farm/storage";

test("timer display rounds partial seconds up and clamps expired deadlines", () => {
  assert.equal(clock(1), "00:01");
  assert.equal(clock(60_001), "01:01");
  assert.equal(clock(25 * 60_000), "25:00");
  assert.equal(clock(-1000), "00:00");
});

test("asset paths preserve filenames with spaces and reserved characters", () => {
  assert.equal(asset("a b#c.png"), "/assets/a%20b%23c.png");
});

test("transactions pass arguments and preserve database failure messages", async () => {
  const args = { p_session_id: "session-1" };
  const client = {
    rpc: async (name: string, parameters: unknown) => {
      assert.equal(name, "reap_focus");
      assert.deepEqual(parameters, args);
      return { data: null, error: { message: "Focus session not found" } };
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    runTransaction(client, "reap_focus", args),
    /Focus session not found/,
  );
  const emptyClient = {
    rpc: async () => ({ data: null, error: null }),
  } as unknown as SupabaseClient;
  await assert.rejects(runTransaction(emptyClient, "pull_egg"), /no result/);
});

test("preferences isolate users and tolerate damaged or blocked storage", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    writeSetting(
      "a",
      "prefs",
      JSON.stringify({ outfit: "red", muted: true, volume: 2 }),
    );
    assert.deepEqual(readPreferences("a"), {
      outfit: "red",
      muted: true,
      volume: 1,
    });
    assert.deepEqual(readPreferences("b"), defaultPreferences);
    for (const invalid of [
      "null",
      "{",
      '"string"',
      '{"outfit":"pink","volume":"loud"}',
    ]) {
      writeSetting("a", "prefs", invalid);
      assert.deepEqual(readPreferences("a"), defaultPreferences);
    }
    writeSetting("a", "breakEndsAt", "123");
    writeSetting("a", "breakEndsAt", null);
    assert.equal(readSetting("a", "breakEndsAt"), null);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    assert.deepEqual(readPreferences("a"), defaultPreferences);
    assert.doesNotThrow(() => writeSetting("a", "prefs", "{}"));
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
