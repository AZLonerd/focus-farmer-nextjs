"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Outfit, Screen, Focus, Pet } from "./types";
import { useFocusMusic } from "./use-focus-music";
import { loadFarm, loadProgress, runTransaction } from "./repository";
import { readPreferences, readSetting, writeSetting } from "./storage";

/** Coordinates authenticated farm state and actions; rewards remain database-owned. */
export function useFarm() {
  const [supabase] = useState(createClient);
  const [screen, setScreen] = useState<Screen>("landing");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const activeUser = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ coins: 0, sessions: 0 });
  const [pets, setPets] = useState<Pet[]>([]);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [summary, setSummary] = useState<Focus | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [displayMode, setDisplayMode] = useState<"down" | "up">("down");
  const [mode, setMode] = useState<"regular" | "hard">("regular");
  const [outfit, setOutfit] = useState<Outfit>("blue");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [now, setNow] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const [restLine, setRestLine] = useState("");
  const [gachaOpen, setGachaOpen] = useState(false);
  const [eggStage, setEggStage] = useState<"idle" | "wobble" | "reveal">(
    "idle",
  );
  const [newPet, setNewPet] = useState<Pet | null>(null);
  const [walkthrough, setWalkthrough] = useState(-1);
  const [prefsReady, setPrefsReady] = useState(false);
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionPending = useRef(false);

  useEffect(
    () => () => {
      activeUser.current = null;
      if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
      if (hatchTimer.current) clearTimeout(hatchTimer.current);
    },
    [],
  );

  const loadData = useCallback(
    async (id: string) => {
      let saved;
      try {
        saved = await loadFarm(supabase, id);
      } catch (error) {
        if (activeUser.current === id) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load your farm.",
          );
          setScreen("setup");
        }
        return;
      }
      if (activeUser.current !== id) return;
      setProgress(saved.progress);
      setPets(saved.pets);
      setFocus(saved.session);
      setScreen(saved.session ? "focus" : "setup");
      const prefs = readPreferences(id);
      setOutfit(prefs.outfit);
      setMuted(prefs.muted);
      setVolume(prefs.volume);
      const end = Number(readSetting(id, "breakEndsAt"));
      if (end > Date.now()) {
        setBreakEndsAt(end);
        if (!saved.session) setScreen("rest");
      }
      if (!readSetting(id, "walkthrough")) setWalkthrough(0);
      setPrefsReady(true);
    },
    [supabase],
  );

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!alive) return;
        const id = data.user?.id || null;
        activeUser.current = id;
        setUserId(id);
        if (id) await loadData(id);
        if (alive) setLoading(false);
      })
      .catch((error: unknown) => {
        if (alive)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not check your session.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [supabase, loadData]);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (userId && prefsReady)
      writeSetting(userId, "prefs", JSON.stringify({ outfit, muted, volume }));
  }, [userId, prefsReady, outfit, muted, volume]);
  useFocusMusic(
    focus?.id,
    screen === "focus" && !!focus && now < new Date(focus.ends_at).getTime(),
    muted,
    volume,
  );

  /** Signs up with email verification or loads an existing user's farm after login. */
  const authenticate = async (kind: "login" | "signup") => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setMessage(
        "Add your Supabase URL and publishable key to .env.local to sign in.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (kind === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        setMessage(
          "Check your email to verify your account before logging in.",
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        activeUser.current = data.user.id;
        setUserId(data.user.id);
        setScreen("welcome");
        welcomeTimer.current = setTimeout(
          () => void loadData(data.user.id),
          1700,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  };
  /** Ends authentication and clears all user-owned state and delayed reveals. */
  const logout = async () => {
    if (!window.confirm("Log out of Focus Farmer?")) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
    if (hatchTimer.current) clearTimeout(hatchTimer.current);
    setGachaOpen(false);
    setEggStage("idle");
    setNewPet(null);
    activeUser.current = null;
    setUserId(null);
    setPrefsReady(false);
    setFocus(null);
    setSummary(null);
    setPets([]);
    setProgress({ coins: 0, sessions: 0 });
    setBreakEndsAt(null);
    setWalkthrough(-1);
    setOutfit("blue");
    setMuted(false);
    setVolume(0.5);
    setScreen("landing");
    setMessage("");
  };
  /** Prevents overlapping transactions and releases busy state after failures. */
  const performAction = async (action: () => Promise<void>) => {
    if (actionPending.current || busy || eggStage === "wobble") return;
    actionPending.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };

  /** Starts or resumes the database-owned session for the current settings. */
  const farm = async () => {
    const duration = Number(minutes);
    if (!Number.isFinite(duration) || duration < 0.1 || duration > 180) {
      setMessage("Choose 0.1 to 180 minutes.");
      return;
    }
    await performAction(async () => {
      const session = await runTransaction<Focus>(supabase, "start_focus", {
        p_minutes: duration,
        p_mode: mode,
        p_display_mode: displayMode,
        p_outfit: outfit,
      });
      setFocus(session);
      setNow(Date.now());
      setScreen("focus");
    });
  };

  /** Claims a session once; the database decides whether it earned rewards. */
  const reap = async () => {
    if (!focus) return;
    await performAction(async () => {
      const result = await runTransaction<Focus>(supabase, "reap_focus", {
        p_session_id: focus.id,
      });
      setFocus(null);
      setSummary(result);
      setScreen("summary");
      if (userId) setProgress(await loadProgress(supabase, userId));
    });
  };

  /** Purchases a pet transactionally, then reveals it after the egg animation. */
  const pullEgg = async () => {
    if (progress.coins < 10) {
      setMessage("You need 10 coins to pull an egg.");
      return;
    }
    await performAction(async () => {
      setNewPet(null);
      const pet = await runTransaction<Pet>(supabase, "pull_egg");
      setProgress((p) => ({ ...p, coins: Math.max(0, p.coins - 10) }));
      setPets((p) => [pet, ...p]);
      setEggStage("wobble");
      // The busy flag is also held by the animation state until the reveal.
      hatchTimer.current = setTimeout(() => {
        setNewPet(pet);
        setEggStage("reveal");
      }, 1150);
    });
  };
  /** Persists an absolute local break deadline, independent of focus rewards. */
  const startBreak = () => {
    const duration = Number(breakMinutes);
    if (!Number.isFinite(duration) || duration < 0.1 || duration > 60) {
      setMessage("Choose 0.1 to 60 minutes.");
      return;
    }
    const end = Date.now() + duration * 60000;
    setBreakEndsAt(end);
    setRestLine("");
    setMessage("");
    if (userId) writeSetting(userId, "breakEndsAt", String(end));
  };
  /** Cancels the local break and returns to session setup. */
  const backToFocus = () => {
    setBreakEndsAt(null);
    setRestLine("");
    if (userId) writeSetting(userId, "breakEndsAt", null);
    setScreen("setup");
  };
  /** Advances the tour and records completion for the current user. */
  const nextWalkthrough = () => {
    if (walkthrough === 3) {
      setWalkthrough(-1);
      if (userId) writeSetting(userId, "walkthrough", "done");
    } else setWalkthrough(walkthrough + 1);
  };
  const remaining = focus ? new Date(focus.ends_at).getTime() - now : 0;
  const elapsed = focus ? now - new Date(focus.started_at).getTime() : 0;
  const complete = !!focus && remaining <= 0;
  const breakActive = breakEndsAt !== null && breakEndsAt > now;
  const refreshProgress = async () => {
    if (userId) setProgress(await loadProgress(supabase, userId));
  };

  return {
    screen,
    setScreen,
    loading,
    userId,
    email,
    setEmail,
    password,
    setPassword,
    message,
    setMessage,
    busy: busy || eggStage === "wobble",
    progress,
    refreshProgress,
    pets,
    focus,
    summary,
    minutes,
    setMinutes,
    displayMode,
    setDisplayMode,
    mode,
    setMode,
    outfit,
    setOutfit,
    muted,
    setMuted,
    volume,
    setVolume,
    now,
    breakMinutes,
    setBreakMinutes,
    breakEndsAt,
    restLine,
    setRestLine,
    gachaOpen,
    setGachaOpen,
    eggStage,
    setEggStage,
    newPet,
    setNewPet,
    walkthrough,
    authenticate,
    logout,
    farm,
    reap,
    pullEgg,
    startBreak,
    backToFocus,
    nextWalkthrough,
    remaining,
    elapsed,
    complete,
    breakActive,
  };
}
