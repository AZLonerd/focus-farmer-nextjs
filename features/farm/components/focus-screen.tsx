import type { useFarm } from "../use-farm";
import { clock } from "../constants";
import { Farmer } from "./sprites";

type Props = Pick<
  ReturnType<typeof useFarm>,
  | "busy"
  | "focus"
  | "muted"
  | "setMuted"
  | "volume"
  | "setVolume"
  | "reap"
  | "remaining"
  | "elapsed"
  | "complete"
>;

/** Displays the focus screen; state changes are delegated to the farm controller. */
export function FocusScreen({
  busy,
  focus,
  muted,
  setMuted,
  volume,
  setVolume,
  reap,
  remaining,
  elapsed,
  complete,
}: Props) {
  if (!focus) return null;
  return (
    <section className="card centered">
      <div className="eyebrow">FOCUS IN PROGRESS</div>
      <h1>{complete ? "Harvest is ready!" : "Keep on farming"}</h1>
      <p className="subtle">
        {focus.mode === "hard" ? "Hard Mode" : "Regular Mode"} · {focus.minutes}{" "}
        minutes
      </p>
      <div className="sprite-stage">
        <div className="stage-ground" />
        <Farmer
          color={focus.outfit}
          frame={complete ? 1 : 0}
          walking={!complete}
        />
      </div>
      <div className="timer">
        {clock(
          focus.display_mode === "up"
            ? Math.min(elapsed, focus.minutes * 60000)
            : remaining,
        )}
      </div>
      <p className="timer-caption">
        {complete
          ? "Session complete — press REAP to claim."
          : focus.display_mode === "up"
            ? "time focused"
            : "time remaining"}
      </p>
      <div className="music">
        <span>♫ Focus music</span>
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute music" : "Mute music"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          aria-label="Music volume"
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>
      <button
        className={`${complete ? "primary big" : "secondary"} full`}
        disabled={busy}
        onClick={reap}
      >
        REAP
      </button>
      {!complete && (
        <p className="fineprint">
          Reaping early ends this session with no coins.
        </p>
      )}
    </section>
  );
}
