import { useEffect, useRef } from "react";
import { asset, tracks } from "./constants";

/** Owns one playlist per active session, disposing audio when the session ends. */
export function useFocusMusic(
  sessionId: string | undefined,
  enabled: boolean,
  muted: boolean,
  volume: number,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const audio = new Audio();
    audioRef.current = audio;
    const next = () => {
      let index = Math.floor(Math.random() * tracks.length);
      if (audio.src.endsWith(encodeURIComponent(tracks[index])))
        index = (index + 1) % tracks.length;
      audio.src = asset(tracks[index]);
      // Autoplay may be blocked until the browser receives a user gesture.
      void audio.play().catch(() => {});
    };
    audio.addEventListener("ended", next);
    next();
    return () => {
      audio.pause();
      audio.removeEventListener("ended", next);
      audioRef.current = null;
    };
  }, [sessionId, enabled]);

  // Track changes retain these element properties instead of restoring old settings.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
      audioRef.current.volume = volume;
    }
  }, [sessionId, enabled, muted, volume]);
}
